/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is FhcDbHandler.
 *
 * The Initial Developer of the Original Code is Stephan Mahieu.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Stephan Mahieu <stephanmahieu@yahoo.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */


/**
 * Formhistory Database (sqlite) Handler.
 *
 * Dependencies: FhcUtil.js
 */
function FhcDbHandler() {

  /**
   * Get the path to formhistory.sqlite database.
   * @return {nsIFile} the path to the formhistory.sqlite database
   */
  this.getFormhistoryFile = function() {
    var sqlfile = this.getProfileDir();
    sqlfile.append("formhistory.sqlite");
    if (!sqlfile.exists()) {
      // new since FF 3.0, make sure not to create an empty
      // file which might interfere with future updates
      sqlfile.append(".dummy");
    }
    return sqlfile;
  };

  /**
   * Get the path to my cleanup.sqlite database, if it does not exist it will be
   * created.
   * @return {nsIFile} the path to the cleanup.sqlite database
   */
  this.getCleanupFile = function() {
    var sqlfile = this.getProfileDir();
    // Using the extensions own install directory means it gets deleted every
    // time a new version is installed(!), so use the profiledir.
    sqlfile.append("cleanup.sqlite");
    return sqlfile;
  };

  /**
   * Get the profile directory.
   * @returns {nsIFile} the path to the profile directory
   */
  this.getProfileDir = function() {
    var dirServiceProp = Components.classes["@mozilla.org/file/directory_service;1"]
                           .getService(Components.interfaces.nsIProperties);
    var profileDir = dirServiceProp.get("ProfD", Components.interfaces.nsIFile);
    return profileDir;
  };

  // Initialize
  this.formHistoryFile = this.getFormhistoryFile();
  this.cleanupFile = this.getCleanupFile();

  // Get the storageService
  this.storageService = Components.classes["@mozilla.org/storage/service;1"]
                          .getService(Components.interfaces.mozIStorageService);
}


//-------------------------------------------------------------
// FhcDbHandler
//-------------------------------------------------------------
FhcDbHandler.prototype = {

  /**
   * Test if the database directory is readable/writable.
   *
   * @return {boolean} wether or not the db directory is okay.
   */
  databaseDirOkay: function() {
    var dir =  this.formHistoryFile.parent;
    return (dir.exists() && dir.isDirectory() && dir.isReadable() && dir.isWritable());
  },

  /**
   * Test if the formhistory DB has been created and is ready for use.
   * If the filename ends with .dummy, it is not created by the browser yet.
   * (SeaMonkey creates this file not by default but on first use)
   *
   * @return {boolean} wether or not the formhistory db is okay.
   */
  formhistoryDbReady: function() {
    return (!this.formHistoryFile.leafName.match(/\.dummy$/));
  },

  /**
   * Query all entries from the formhistory database.
   *
   * @return {Array}
   *         an array of all formhistory entries from the database table
   */
  getAllEntries: function() {
    var mDBConn = this._getHistDbConnection();
    var result = [];
    
    var resultOk = false, statement, place;
    try {
      statement = mDBConn.createStatement(
          "SELECT id, fieldname, value, timesUsed, firstUsed, lastUsed" +
          "  FROM moz_formhistory");
      while (statement.executeStep()) {

        place = this.getVisitedPlace(statement.row.fieldname, statement.row.lastUsed);

        result.push({
          id:    statement.row.id,
          name:  statement.row.fieldname,
          value: statement.row.value,
          used:  statement.row.timesUsed,
          first: statement.row.firstUsed,
          last:  statement.row.lastUsed,
          place: place}
        );
      }

      resultOk = true;
    } catch(ex) {
      dump('getAllEntries:Exception: ' + ex);
    } finally {
      this._closeStatement(statement);
      this._endHistDbConnection(mDBConn, resultOk);
    }
    return result;
  },


  /**
   * Add a new entry to the database, return the database Id on succes,
   * null otherwise.
   *
   * @param  newEntry {Object}
   *         a new formhistory object to be added to the database
   *
   * @param  newId {Integer}
   *         the first available database id (primary key), if null the
   *         next available Id will be queried from the database
   *
   * @return {Integer}
   *         the next database id (primary key) of the newly added entry
   */
  addEntry: function(newEntry, newId) {
    var mDBConn = this._getHistDbConnection(true);

    // determine new database index (lastIndex + 1)
    if (undefined == newId) {
      newId = this._getLastId(mDBConn);
      if (0 > newId) {
        this._endHistDbConnection(mDBConn, result);
        return null;
      }
      newId++;
    }
    
    var result = false, statement;
    try {
      statement = mDBConn.createStatement(
          "INSERT" +
          "  INTO moz_formhistory (id, fieldname, value, timesUsed, firstUsed, lastUsed) " +
          "VALUES (:id, :name, :value, :used, :first, :last)");
      statement.params.id    = newId;
      statement.params.name  = newEntry.name;
      statement.params.value = newEntry.value;
      statement.params.used  = newEntry.used;
      statement.params.first = newEntry.first;
      statement.params.last  = newEntry.last;
      result = this._executeStatement(statement);
    } finally {
      this._endHistDbConnection(mDBConn, result);
    }
    return result ? newId : null;
  },
  
  /**
   * Add new formhistory entries to the database, return the last used Id on
   * succes, null otherwise.
   *
   * @param  newEntries {Array}
   *         an array of new formhistory entry objects to be added to the
   *         database
   *
   * @return {Integer}
   *         the database id (primary key) of the last entry added
   */
  bulkAddEntries: function(newEntries) {
    var mDBConn = this._getHistDbConnection(true);

    // determine new database index (lastIndex + 1)
    var newId = this._getLastId(mDBConn);
    if (0 > newId) {
      this._endHistDbConnection(mDBConn, result);
      return null;
    }
    
    var result = true, statement;
    try {
      statement = mDBConn.createStatement(
          "INSERT " +
          "  INTO moz_formhistory (id, fieldname, value, timesUsed, firstUsed, lastUsed) " +
          "VALUES (:id, :name, :value, :used, :first, :last)");
      for(var ii=0; result && ii < newEntries.length; ii++) {
        newId++;
        statement.params.id    = newId;
        statement.params.name  = newEntries[ii].name;
        statement.params.value = newEntries[ii].value;
        statement.params.used  = newEntries[ii].used;
        statement.params.first = newEntries[ii].first;
        statement.params.last  = newEntries[ii].last;
        result = this._executeReusableStatement(statement);
      }
    } finally {
      this._closeStatement(statement);
      this._endHistDbConnection(mDBConn, result);
    }
    return result;
  },
  
  /**
   * Update a formhistory entry in the database, return true on succes.
   *
   * @param  entry {Object}
   *         the formhistory entry object to be updated
   *
   * @return {Boolean}
   *         whether or not updating succeeded
   */
  updateEntry: function(entry) {
    var mDBConn = this._getHistDbConnection(true);
    
    var result = false;
    try {
      var statement = mDBConn.createStatement(
          "UPDATE moz_formhistory" +
          "   SET fieldname = :name, value = :value" +
          " WHERE id = :id");
      statement.params.name  = entry.name;
      statement.params.value = entry.value;
      statement.params.id    = entry.id;
      result = this._executeStatement(statement);
    } finally {
      this._endHistDbConnection(mDBConn, result);
    }
    return result;
  },

  /**
   * Update the usage statistics (timesUsed, lastUsed) of the entry matching
   * the given fieldname and value, return true on succes.
   *
   * @param  fieldname {String}
   *         the fieldname of the entries to be deleted
   *
   * @param  value {String}
   *         the value of the entries to be deleted
   *
   * @param  nowDate {Integer}
   *         Date when entry was last used (usually the current systemdate)
   * 
   * @return {Boolean}
   *         whether or not updating succeeded
   */
  updateEntryStatistics: function(fieldname, value, nowDate) {
    var mDBConn = this._getHistDbConnection();

    var result = false;
    try {
      var statement, id, timesUsed;

      // Get the entry by name and value
      statement = mDBConn.createStatement(
          "SELECT id, timesUsed" +
          "  FROM moz_formhistory" +
          " WHERE fieldname = :name AND value = :value");
      statement.params.name  = fieldname;
      statement.params.value = value;
      result = statement.executeStep();
      if (result) {
        id = statement.row.id;
        timesUsed = statement.row.timesUsed;

        // update timesUsed and lastUsed
        statement = mDBConn.createStatement(
            "UPDATE moz_formhistory" +
            "   SET timesUsed = :timesUsed, lastUsed = :lastUsed" +
            " WHERE id = :id");
        statement.params.id        = id;
        statement.params.timesUsed = ++timesUsed;
        statement.params.lastUsed  = nowDate;
        result = statement.executeStep();
      }
    } catch(ex) {
      result = false;
      dump('updateEntryStatistics:Exception: ' + ex);
    } finally {
      this._closeStatement(statement);
      this._endHistDbConnection(mDBConn, result);
    }
    return result;
  },
  
  /**
   * Delete formhistory entries from the database, return true on succes.
   *
   * @param  entries {Array}
   *         an array of existing formhistory objects to be deleted from the
   *         database
   *
   * @return {Boolean}
   *         whether or not deleting succeeded
   */
  deleteEntries: function(entries) {
    var mDBConn = this._getHistDbConnection(true);

    var result = false, statement;
    try {
      statement = mDBConn.createStatement(
          "DELETE " +
          "  FROM moz_formhistory" +
          " WHERE id = :id");
      for (var it=0; it < entries.length; it++) {
        statement.params.id = entries[it].id;
        result = this._executeReusableStatement(statement);
        if (!result) break;
      }
    } finally {
      this._closeStatement(statement);
      this._endHistDbConnection(mDBConn, result);
    }
    return result;
  },
  
  /**
   * Delete all entries with the given fieldname, return true on succes.
   *
   * @param  fieldname {String}
   *         the fieldname of the entries to be deleted
   *
   * @return {Boolean}
   *         whether or not deleting all named entries succeeded
   */
  deleteEntriesByName: function(fieldname) {
    var mDBConn = this._getHistDbConnection(true);

    var result = false;
    try {
      var statement = mDBConn.createStatement(
          "DELETE" +
          "  FROM moz_formhistory" +
          " WHERE fieldname = :name");
      statement.params.name = fieldname;
      result = this._executeStatement(statement);
    } finally {        
      this._endHistDbConnection(mDBConn, result);
    }
    return result;
  },
  
  /**
   * Delete all entries matching the given fieldname and value,
   * return true on succes.
   *
   * @param  fieldname {String}
   *         the fieldname of the entries to be deleted
   *
   * @param  value {String}
   *         the value of the entries to be deleted
   *
   * @return {Boolean}
   *         whether or not deleting all matching entries succeeded
   */
  deleteEntryByNameAndValue: function(fieldname, value) {
    var mDBConn = this._getHistDbConnection(true);

    var result = false;
    try {
      var statement = mDBConn.createStatement(
          "DELETE" +
          "  FROM moz_formhistory" +
          " WHERE fieldname = :name AND value = :value");
      statement.params.name  = fieldname;
      statement.params.value = value;
      result = this._executeStatement(statement);
    } finally {
      this._endHistDbConnection(mDBConn, result);
    }
    return result;
  },
  
  /**
   * Check whether or not the entry with the given fieldname and value exists.
   *
   * @param  fieldname {String}
   *         the fieldname of the entries to be queried
   *
   * @param  value {String}
   *         the value of the entries to be queried
   *
   * @return {Boolean}
   *         whether or not the entry exists in the database
   */
  entryExists: function(fieldname, value) {
    var mDBConn = this._getHistDbConnection();
    
    var count = 0, statement;
    try {
      statement = mDBConn.createStatement(
          "SELECT count(*)" +
          "  FROM moz_formhistory" +
          " WHERE fieldname = :name AND value = :value");
      statement.params.name  = fieldname;
      statement.params.value = value;
      if (statement.executeStep()) {
        count = statement.getInt64(0);
      }
    } catch(ex) {
      dump('entryExists:Exception: ' + ex);
    } finally {
      this._closeStatement(statement);
      this._endHistDbConnection(mDBConn, true);
    }
    return (count != 0);
  },

  /**
   * Return the total number of formhistory entries in the database.
   *
   * @return {Integer}
   *         the total number of formhistory entries in the database
   */
  getNoOfItems: function() {
    var mDBConn = this._getHistDbConnection();

    var count = 0, statement;
    try {
      statement = mDBConn.createStatement(
          "SELECT count(*)" +
          "  FROM moz_formhistory");
      if (statement.executeStep()) {
        count = statement.getInt64(0);
      }
    } catch(ex) {
      dump('getNoOfItems:Exception: ' + ex);
    } finally {
      this._closeStatement(statement);
      this._endHistDbConnection(mDBConn, true);
    }
    return count;
  },

  /**
   * Get the most recent added entry with the given fieldname.
   *
   * @param  fieldname {String}
   *         the fieldname of the entries to be queried
   *
   * @return {String}
   *         the value of the most recent used fieldname
   */
  getMostRecentEntry: function(fieldname) {
    var mDBConn = this._getHistDbConnection();
    var result = "";

    var resultOk = false, statement;
    try {
      statement = mDBConn.createStatement(
          "SELECT value" +
          "  FROM moz_formhistory" +
          " WHERE fieldname = :name" +
          " ORDER BY lastUsed DESC");
      statement.params.name = fieldname;

      if (statement.executeStep()) {
        result = statement.row.value;
      }
      resultOk = true;
    } catch(ex) {
      dump('getMostRecentEntry:Exception: ' + ex);
    } finally {
      this._closeStatement(statement);
      this._endHistDbConnection(mDBConn, resultOk);
    }
    return result;
  },

  /**
   * Get the most often used entry with the given fieldname.
   *
   * @param  fieldname {String}
   *         the fieldname of the entry to be queried
   *
   * @return {String}
   *         the value of the most often used fieldname
   */
  getMostUsedEntry: function(fieldname) {
    var mDBConn = this._getHistDbConnection();
    var result = "";

    var resultOk = false, statement;
    try {
      statement = mDBConn.createStatement(
          "SELECT value" +
          "  FROM moz_formhistory" +
          " WHERE fieldname = :name" +
          " ORDER BY timesUsed DESC");
      statement.params.name = fieldname;

      if (statement.executeStep()) {
        result = statement.row.value;
      }
      resultOk = true;
    } catch(ex) {
      dump('getMostUsedEntry:Exception: ' + ex);
    } finally {
      this._closeStatement(statement);
      this._endHistDbConnection(mDBConn, resultOk);
    }
    return result;
  },



  //----------------------------------------------------------------------------
  // Places methods
  //----------------------------------------------------------------------------

  /**
   * Query the (probable) location where the formfield was submitted from.
   *
   * @param fieldName {String}
   *        the name of the formfield
   *
   * @param dateUsed {Integer}
   *        date when the formfield was used
   *
   * @return {Array}
   *         the location information
   */
  getVisitedPlace: function(fieldName, dateUsed) {
    var result = [];
    
    var tresholdFirst = 1000000*60*60*24*7; // 7 days

    if (fieldName == "searchbar-history") {
      return result;
    }

    var mPlacesDbConn = this._getPlacesDbConnection();
    try {
      var statement = mPlacesDbConn.createStatement(
        "SELECT p.url, p.title, p.rev_host, h.visit_date " +
        "  FROM moz_places p, moz_historyvisits h " +
        " WHERE p.id = h.place_id " +
        "   AND h.visit_date < :lastUsed " +
        " ORDER BY visit_date DESC ");
      statement.params["lastUsed"] = dateUsed;

      // select first candidate
      var timeDiff, host;
      if (statement.executeStep()) {
        host = FhcUtil.strReverse(statement.row["rev_host"]);
        //delete leading dot
        host = host.replace(/^\./g, "");

        // select first found if under the tresholdFirst limit
        timeDiff = dateUsed - statement.row["visit_date"];
        if (timeDiff < tresholdFirst) {
          result.push({
            url  : statement.row["url"],
            host : host,
            title: statement.row["title"],
            date : statement.row["visit_date"]}
          );
        }
      }
    } catch(ex) {
      dump('getVisitedPlace:Exception: ' + ex);
    } finally {
      statement.finalize();
    }
    return result;
  },

  /**
   * Query the location(s) visited just before the formfield was submitted.
   *
   * @param dateUsed {Integer}
   *        date when the formfield was used
   *
   * @param maxCandidates {Integer}
   *        max. number of places to return
   *
   * @return {Array}
   *         the location information
   */
  getVisitedPlaces: function(dateUsed, maxCandidates) {
    var result = [];

    var mPlacesDbConn = this._getPlacesDbConnection();
    try {
      var statement = mPlacesDbConn.createStatement(
        "SELECT p.url, p.title, p.rev_host, p.visit_count, h.visit_date " +
        "  FROM moz_places p, moz_historyvisits h " +
        " WHERE p.id = h.place_id " +
        "   AND h.visit_date < :lastUsed " +
        " ORDER BY visit_date DESC ");
      statement.params["lastUsed"] = dateUsed;

      var host;
      while ((result.length < maxCandidates) && statement.executeStep()) {
        // reverse host and delete leading dot
        host = FhcUtil.strReverse(statement.row["rev_host"]);
        host = host.replace(/^\./g, "");

        result.push({
          url  : statement.row["url"],
          host : host,
          title: statement.row["title"],
          count: statement.row["visit_count"],
          date : statement.row["visit_date"]}
        );
      }
    } catch(ex) {
      dump('getVisitedPlaces:Exception: ' + ex);
    } finally {
      statement.finalize();
    }
    return result;
  },

  /**
   * Query the location(s) visited just after the formfield was submitted.
   *
   * @param dateUsed {Integer}
   *        date when the formfield was used
   *
   * @param maxCandidates {Integer}
   *        max. number of places to return
   *
   * @return {Array}
   *         the location information
   */
  getVisitedPlacesAfter: function(dateUsed, maxCandidates) {
    var result = [];

    var mPlacesDbConn = this._getPlacesDbConnection();
    try {
      var statement = mPlacesDbConn.createStatement(
        "SELECT p.url, p.title, p.rev_host, p.visit_count, h.visit_date " +
        "  FROM moz_places p, moz_historyvisits h " +
        " WHERE p.id = h.place_id " +
        "   AND h.visit_date > :lastUsed " +
        " ORDER BY visit_date ASC ");
      statement.params["lastUsed"] = dateUsed;

      var host;
      while ((result.length < maxCandidates) && statement.executeStep()) {
        // reverse host and delete leading dot
        host = FhcUtil.strReverse(statement.row["rev_host"]);
        host = host.replace(/^\./g, "");

        result.push({
          url  : statement.row["url"],
          host : host,
          title: statement.row["title"],
          count: statement.row["visit_count"],
          date : statement.row["visit_date"]}
        );
      }
    } catch(ex) {
      dump('getVisitedPlacesAfter:Exception: ' + ex);
    } finally {
      statement.finalize();
    }
    return result;
  },



  //----------------------------------------------------------------------------
  // Cleanup methods
  //----------------------------------------------------------------------------
 
  /**
   * Query all criteria from the cleanup database.
   *
   * @return {Array}
   *         an array of all cleanup entries from the database table
   */
  getAllCleanupCriteria: function() {
    return this._getAllCriteria('C');
  },

  /**
   * Add a new cleanup criteria to the database, return the database Id on
   * succes, null otherwise.
   *
   * @param  newCriteria {Object}
   *         a new cleanup object to be added to the database
   *
   * @return {Integer}
   *         the next database id (primary key) of the newly added entry
   */
  addCleanupCriteria: function(newCriteria) {
    return this._addCriteria(newCriteria, 'C');
  },

  /**
   * Add new cleanup criteria to the database, return the last used Id on
   * succes, null otherwise.
   *
   * @param  newCriteria {Array}
   *         an array of new cleanup criteria objects to be added to the
   *         database
   *
   * @return {Integer}
   *         the database id (primary key) of the last entry added
   */
  bulkAddCleanupCriteria: function(newCriteria) {
    return this._bulkAddCriteria(newCriteria, 'C');
  },



  //----------------------------------------------------------------------------
  // Protect methods
  //----------------------------------------------------------------------------

  /**
   * Query all protect-criteria from the cleanup database.
   *
   * @return {Array}
   *         an array of all protect entries from the database table
   */
  getAllProtectCriteria: function() {
    return this._getAllCriteria('P');
  },

  /**
   * Add a new protect criteria to the database, return the database Id on
   * succes, null otherwise.
   *
   * @param  newProtectCriteria {Object}
   *         a new protect object to be added to the database
   *
   * @return {Integer}
   *         the next database id (primary key) of the newly added entry
   */
  addProtectCriteria: function(newProtectCriteria) {
    return this._addCriteria(newProtectCriteria, 'P');
  },

  /**
   * Add new protect criteria to the database, return the last used Id on
   * succes, null otherwise.
   *
   * @param  newProtectCriteria {Array}
   *         an array of new cleanup criteria objects to be added to the
   *         database
   *
   * @return {Integer}
   *         the database id (primary key) of the last entry added
   */
  bulkAddProtectCriteria: function(newProtectCriteria) {
    return this._bulkAddCriteria(newProtectCriteria, 'P');
  },



  //----------------------------------------------------------------------------
  // Combined Criteria methods for CleanUp and Protect
  //----------------------------------------------------------------------------

  /**
   * Return the total number of cleanup/protect entries in the database.
   *
   * @return {Integer}
   *         the total number of cleanup/protect entries in the database
   */
  getNoOfCleanupAndProtectItems: function() {
    var mDBConn = this._getDbCleanupConnection();

    var count = 0, statement;
    try {
      statement = mDBConn.createStatement(
          "SELECT count(*)" +
          "  FROM criteria");
      if (statement.executeStep()) {
        count = statement.getInt64(0);
      }
    } catch(ex) {
      dump('getNoOfCleanupAndProtectItems:Exception: ' + ex);
    } finally {
      this._closeStatement(statement);
      this._closeDbConnection(mDBConn, true);
    }
    return count;
  },

  /**
   * Delete cleanup/protect criteria from the database, return true on succes.
   *
   * @param  criteria {Array}
   *         an array of existing cleanup criteria objects to be deleted from
   *         the database
   *
   * @return {Boolean}
   *         whether or not deleting succeeded
   */
  deleteCriteria: function(criteria) {
    var mDBConn = this._getDbCleanupConnection(true);

    var result = false, statement;
    try {
      statement = mDBConn.createStatement(
          "DELETE" +
          "  FROM criteria" +
          " WHERE id = :id");
      for (var it=0; it < criteria.length; it++) {
        statement.params.id = criteria[it].id;
        result = this._executeReusableStatement(statement);
        if (!result) break;
      }
    } finally {
      this._closeStatement(statement);
      this._closeDbConnection(mDBConn, result);
    }
    return result;
  },

  /**
   * Update a cleanup/protect criteria in the database, return true on succes.
   *
   * @param  criteria {Object}
   *         the cleanup/protect criteria object to be updated
   *
   * @return {Boolean}
   *         whether or not updating succeeded
   */
  updateCriteria: function(criteria) {
    var mDBConn = this._getDbCleanupConnection(true);

    var result = false;
    try {
      var statement = mDBConn.createStatement(
            "UPDATE criteria" +
            "   SET fieldname  = :name,       value = :value,      description = :description," +
            "       nameExact  = :nameExact,  nameCase  = :nameCase,  nameRegex  = :nameRegex," +
            "       valueExact = :valueExact, valueCase = :valueCase, valueRegex = :valueRegex " +
            " WHERE id = :id");
      statement.params.name        = criteria.name;
      statement.params.value       = criteria.value;
      statement.params.description = criteria.description;
      statement.params.nameExact   = criteria.nameExact;
      statement.params.nameCase    = criteria.nameCase;
      statement.params.nameRegex   = criteria.nameRegex;
      statement.params.valueExact  = criteria.valueExact;
      statement.params.valueCase   = criteria.valueCase;
      statement.params.valueRegex  = criteria.valueRegex;
      statement.params.id          = criteria.id;
      result = this._executeStatement(statement);
    } finally {
      this._closeDbConnection(mDBConn, result);
    }
    return result;
  },

  /**
   * Add a new cleanup or protect criteria to the database,
   * return the database Id on succes, null otherwise.
   *
   * @param  newCriteria {Object}
   *         a new cleanup object to be added to the database
   *
   * @param  critType {Char}
   *         the critera type ('C' for CleanUp, 'P' for Protect)
   *
   * @return {Integer}
   *         the next database id (primary key) of the newly added entry
   */
  _addCriteria: function(newCriteria, critType) {
    var mDBConn = this._getDbCleanupConnection(true);

    // determine new database index (lastIndex + 1)
    var newId = this._getLastCriteriaId(mDBConn);
    if (0 > newId) {
      this._closeDbConnection(mDBConn, result);
      return null;
    }
    newId++;

    var result = false, statement;
    try {
      statement = mDBConn.createStatement(
          "INSERT INTO criteria (" +
                      "id, fieldname, value, description, " +
                      "nameExact,  nameCase,  nameRegex,  " +
                      "valueExact, valueCase, valueRegex, " +
                      "critType) " +
          "VALUES (" +
                      ":id, :fieldname, :value, :description, " +
                      ":nameExact,  :nameCase,  :nameRegex,  " +
                      ":valueExact, :valueCase, :valueRegex, " +
                      ":critType)");
      statement.params.id          = newId;
      statement.params.fieldname   = newCriteria.name;
      statement.params.value       = newCriteria.value;
      statement.params.description = newCriteria.description;
      statement.params.nameExact   = newCriteria.nameExact;
      statement.params.nameCase    = newCriteria.nameCase;
      statement.params.nameRegex   = newCriteria.nameRegex;
      statement.params.valueExact  = newCriteria.valueExact;
      statement.params.valueCase   = newCriteria.valueCase;
      statement.params.valueRegex  = newCriteria.valueRegex;
      statement.params.critType    = critType
      result = this._executeStatement(statement);
    } catch(ex) {
      dump('addCleanupCriteria:Exception: ' + ex);
    } finally {
      this._closeDbConnection(mDBConn, result);
    }
    return result ? newId : null;
  },

  /**
   * Query all cleanup or protect criteria from the cleanup database.
   *
   * @param  critType {Char}
   *         the critera type ('C' for CleanUp, 'P' for Protect)
   *
   * @return {Array}
   *         an array of all cleanup entries from the database table
   */
  _getAllCriteria: function(critType) {
    var mDBConn = this._getDbCleanupConnection();
    if (null == mDBConn) {
      // Major problem with cleanupDb
      return null;
    }
    var result = [];
    var resultOk = false, statement;
    try {
      statement = mDBConn.createStatement(
          "SELECT id, fieldname, value, description," +
          "       nameExact,  nameCase,  nameRegex, " +
          "       valueExact, valueCase, valueRegex " +
          "  FROM criteria" +
          " WHERE critType = :critType");

      statement.params.critType = critType;
      while (statement.executeStep()) {
        result.push({
          id:          statement.row.id,
          name:        statement.row.fieldname,
          value:       statement.row.value,
          description: statement.row.description,
          nameExact:   statement.row.nameExact,
          nameCase:    statement.row.nameCase,
          nameRegex:   statement.row.nameRegex,
          valueExact:  statement.row.valueExact,
          valueCase:   statement.row.valueCase,
          valueRegex:  statement.row.valueRegex
        });
      }
      resultOk = true;
    } catch(ex) {
      dump('getAllCleanupCriteria:Exception: ' + ex);
    } finally {
      this._closeStatement(statement);
      this._closeDbConnection(mDBConn, resultOk);
    }
    return result;
  },

  /**
   * Add new cleanup/protect criteria to the database, return the last used Id
   * on succes, null otherwise.
   *
   * @param  newCriteria {Array}
   *         an array of new cleanup/protect criteria objects to be added to
   *         the database
   *
   * @param  critType {Char}
   *         the critera type ('C' for CleanUp, 'P' for Protect)
   *
   * @return {Integer}
   *         the database id (primary key) of the last entry added
   */
  _bulkAddCriteria: function(newCriteria, critType) {
    var mDBConn = this._getDbCleanupConnection(true);

    // determine new database index (lastIndex + 1)
    var newId = this._getLastCriteriaId(mDBConn);
    if (0 > newId) {
      this._closeDbConnection(mDBConn, result);
      return null;
    }

    var result = true, statement;
    try {
      statement = mDBConn.createStatement(
          "INSERT INTO criteria (" +
                      "id, fieldname, value, description, " +
                      "nameExact,  nameCase,  nameRegex,  " +
                      "valueExact, valueCase, valueRegex, " +
                      "critType) " +
          "VALUES (" +
                      ":id, :fieldname, :value, :description, " +
                      ":nameExact,  :nameCase,  :nameRegex,  " +
                      ":valueExact, :valueCase, :valueRegex, " +
                      ":critType)");
      for(var ii=0; result && ii < newCriteria.length; ii++) {
        newId++;
        statement.params.id          = newId;
        statement.params.fieldname   = newCriteria[ii].name;
        statement.params.value       = newCriteria[ii].value;
        statement.params.description = newCriteria[ii].description;
        statement.params.nameExact   = newCriteria[ii].nameExact;
        statement.params.nameCase    = newCriteria[ii].nameCase;
        statement.params.nameRegex   = newCriteria[ii].nameRegex;
        statement.params.valueExact  = newCriteria[ii].valueExact;
        statement.params.valueCase   = newCriteria[ii].valueCase;
        statement.params.valueRegex  = newCriteria[ii].valueRegex;
        statement.params.critType    = critType;
        result = this._executeReusableStatement(statement);
      }
    } finally {
      this._closeStatement(statement);
      this._closeDbConnection(mDBConn, result);
    }
    return result ? newId : null;
  },



  //----------------------------------------------------------------------------
  // RegExp methods
  //----------------------------------------------------------------------------

  /**
   * Query all Regular Expressions from the cleanup database.
   *
   * @return {Array}
   *         an array of all regexp entries from the database table
   */
  getAllRegexp: function() {
    var mDBConn = this._getDbCleanupConnection();
    if (null == mDBConn) {
      // Major problem with cleanupDb
      return null;
    }
    var result = [];
    var resultOk = false, statement;
    try {
      statement = mDBConn.createStatement(
          "SELECT id, description, category, regexp," +
          "       caseSens, useFor, regexpType" +
          "  FROM regexp" +
          " ORDER BY (ifnull(category,'') || description)");

      while (statement.executeStep()) {
        result.push({
          id:          statement.row.id,
          description: statement.row.description,
          category:    statement.row.category,
          regexp:      statement.row.regexp,
          useFor:      statement.row.useFor,
          caseSens:    statement.row.caseSens,
          regexpType:  statement.row.regexpType
        });
      }
      resultOk = true;
    } catch(ex) {
      dump('getAllRegexp:Exception: ' + ex);
    } finally {
      this._closeStatement(statement);
      this._closeDbConnection(mDBConn, resultOk);
    }
    return result;
  },

  /**
   * Add a new regular expression to the database, return the database Id on
   * succes, null otherwise.
   *
   * @param  newRegExp {Object}
   *         a new regexp object to be added to the database
   *
   * @return {Integer}
   *         the next database id (primary key) of the newly added entry
   */
  addRegexp: function(newRegExp) {
    var mDBConn = this._getDbCleanupConnection(true);

    // determine new database index (lastIndex + 1)
    var newId = this._getLastRegexpId(mDBConn);
    if (0 > newId) {
      this._closeDbConnection(mDBConn, result);
      return null;
    }
    newId++;

    var result = false, statement;
    try {
      statement = mDBConn.createStatement(
          "INSERT INTO regexp (" +
                  "id, description, category, regexp, " +
                  "caseSens, useFor, regexpType) " +
          "VALUES (:id, :description, :category, :regexp, " +
                  ":caseSens, :useFor, :regexpType)");
      statement.params.id          = newId;
      statement.params.description = newRegExp.description;
      statement.params.category    = newRegExp.category;
      statement.params.regexp      = newRegExp.regexp;
      statement.params.caseSens    = newRegExp.caseSens;
      statement.params.useFor      = newRegExp.useFor;
      statement.params.regexpType  = newRegExp.regexpType;
      result = this._executeStatement(statement);
      this._setDirtyRegexpFlag();
    } catch(ex) {
      dump('addRegexp:Exception: ' + ex);
    } finally {
      this._closeDbConnection(mDBConn, result);
    }
    return result ? newId : null;
  },

  /**
   * Update a protect-criteria in the database, return true on succes.
   *
   * @param  regExp {Object}
   *         the regExp object to be updated
   *
   * @return {Boolean}
   *         whether or not updating succeeded
   */
  updateRegexp: function(regExp) {
    var mDBConn = this._getDbCleanupConnection(true);

    var result = false;
    try {
      var statement = mDBConn.createStatement(
            "UPDATE regexp" +
            "   SET description = :description," +
            "       category    = :category," +
            "       regexp      = :regexp," +
            "       caseSens    = :caseSens," +
            "       useFor      = :useFor," +
            "       regexpType  = :regexpType" +
            " WHERE id = :id");
      statement.params.description = regExp.description;
      statement.params.category    = regExp.category;
      statement.params.regexp      = regExp.regexp;
      statement.params.caseSens    = regExp.caseSens;
      statement.params.useFor      = regExp.useFor;
      statement.params.regexpType  = regExp.regexpType;
      statement.params.id          = regExp.id;
      result = this._executeStatement(statement);
      this._setDirtyRegexpFlag();
    } finally {
      this._closeDbConnection(mDBConn, result);
    }
    return result;
  },

  /**
   * Delete regexp from the database, return true on succes.
   *
   * @param  regexp {Array}
   *         an array of existing regexp objects to be deleted from
   *         the database
   *
   * @return {Boolean}
   *         whether or not deleting succeeded
   */
  deleteRegexp: function(regexp) {
    var mDBConn = this._getDbCleanupConnection(true);

    var result = false, statement;
    try {
      statement = mDBConn.createStatement(
          "DELETE" +
          "  FROM regexp" +
          " WHERE id = :id");
      for (var it=0; it < regexp.length; it++) {
        statement.params.id = regexp[it].id;
        result = this._executeReusableStatement(statement);
        if (!result) break;
      }
      this._setDirtyRegexpFlag();
    } finally {
      this._closeStatement(statement);
      this._closeDbConnection(mDBConn, result);
    }
    return result;
  },

  /**
   * Delete all builtin regular expressions.
   *
   * @return {Boolean}
   *         whether or not deleting succeeded
   */
  deleteBuiltinRegexp: function() {
    var mDBConn = this._getDbCleanupConnection(true);

    var result = false;
    try {
      var statement = mDBConn.createStatement(
          "DELETE" +
          "  FROM regexp" +
          " WHERE regexpType = 'b'");
      result = this._executeStatement(statement);
      this._setDirtyRegexpFlag();
    } finally {
      this._closeDbConnection(mDBConn, result);
    }
    return result;
  },

  /**
   * Add new regular expressions to the database, return the last used Id on
   * succes, null otherwise.
   *
   * @param  newRegExp {Array}
   *         an array of new newRegExp objects to be added to the
   *         database
   *
   * @return {Integer}
   *         the database id (primary key) of the last entry added
   */
  bulkAddRegexp: function(newRegExp) {
    var mDBConn = this._getDbCleanupConnection(true);

    // determine new database index (lastIndex + 1)
    var newId = this._getLastRegexpId(mDBConn);
    if (0 > newId) {
      this._closeDbConnection(mDBConn, result);
      return null;
    }

    var result = true, statement;
    try {
      statement = mDBConn.createStatement(
          "INSERT INTO regexp (" +
                  "id, description, category, regexp, " +
                  "caseSens, useFor, regexpType) " +
          "VALUES (:id, :description, :category, :regexp, " +
                  ":caseSens, :useFor, :regexpType)");
      for(var ii=0; result && ii < newRegExp.length; ii++) {
        newId++;
        statement.params.id          = newId;
        statement.params.description = newRegExp[ii].description;
        statement.params.category    = newRegExp[ii].category;
        statement.params.regexp      = newRegExp[ii].regexp;
        statement.params.caseSens    = newRegExp[ii].caseSens;
        statement.params.useFor      = newRegExp[ii].useFor;
        statement.params.regexpType  = newRegExp[ii].regexpType;
        result = this._executeReusableStatement(statement);
      }
      this._setDirtyRegexpFlag();
    } finally {
      this._closeStatement(statement);
      this._closeDbConnection(mDBConn, result);
    }
    return result ? newId : null;
  },

  /**
   * Query all Regular Expressions categories from the cleanup database.
   *
   * @return {Array}
   *         an array of all regexp categories from the database table
   */
  getRegexpCategories: function() {
    var mDBConn = this._getDbCleanupConnection();
    if (null == mDBConn) {
      // Major problem with cleanupDb
      return null;
    }
    var result = [];
    var resultOk = false, statement;
    try {
      statement = mDBConn.createStatement(
          "SELECT DISTINCT category" +
          "  FROM regexp" +
          " ORDER BY category");

      while (statement.executeStep()) {
        result.push({
          category: statement.row.category
        });
      }
      resultOk = true;
    } catch(ex) {
      dump('getRegexpCategories:Exception: ' + ex);
    } finally {
      this._closeStatement(statement);
      this._closeDbConnection(mDBConn, resultOk);
    }
    return result;
  },

  /**
   * Return the total number of regexp entries in the database.
   *
   * @return {Integer}
   *         the total number of regexp entries in the database
   */
  getNoOfRegexpItems: function() {
    var mDBConn = this._getDbCleanupConnection();

    var count = 0, statement;
    try {
      statement = mDBConn.createStatement(
          "SELECT count(*)" +
          "  FROM regexp");
      if (statement.executeStep()) {
        count = statement.getInt64(0);
      }
    } catch(ex) {
      dump('getNoOfRegexpItems:Exception: ' + ex);
    } finally {
      this._closeStatement(statement);
      this._closeDbConnection(mDBConn, true);
    }
    return count;
  },



  //----------------------------------------------------------------------------
  // ID Helper methods
  //----------------------------------------------------------------------------

  /**
   * Query the last used formhistory database id (primary key).
   *
   * @param  mDBConnection {mozIStorageConnection}
   *         the database connection
   *
   * @return {Integer}
   *         the last used formhistory database id or -1 if db is empty
   */
  _getLastId: function(mDBConnection) {
    var lastId = -1;
    var statement;
    try {
      statement = mDBConnection.createStatement("SELECT max(id) FROM moz_formhistory");
      statement.executeStep();
      lastId = statement.getInt64(0);
    } catch(ex) {
      dump('_getLastId:Exception: ' + ex);
    } finally {
      this._closeStatement(statement);
    }
    return lastId;
  },

  /**
   * Query the last used cleanupcriteria database id (primary key).
   *
   * @param  mDBConnection {mozIStorageConnection}
   *         the database connection
   *
   * @return {Integer}
   *         the last used cleanupcriteria database id or -1 if db is empty
   */
  _getLastCriteriaId: function(mDBConnection) {
    var lastId = -1;

    var statement;
    try {
      statement = mDBConnection.createStatement(
          "SELECT max(id)" +
          "  FROM criteria");
      statement.executeStep();
      lastId = statement.getInt64(0);
    } catch(ex) {
      dump('_getLastCriteriaId:Exception: ' + ex);
    } finally {
      this._closeStatement(statement);
    }
    return lastId;
  },

  /**
   * Query the last used regexp database id (primary key).
   *
   * @param  mDBConnection {mozIStorageConnection}
   *         the database connection
   *
   * @return {Integer}
   *         the last used regexp database id or -1 if db is empty
   */
  _getLastRegexpId: function(mDBConnection) {
    var lastId = -1;

    var statement;
    try {
      statement = mDBConnection.createStatement(
          "SELECT max(id)" +
          "  FROM regexp");
      statement.executeStep();
      lastId = statement.getInt64(0);
    } catch(ex) {
      dump('_getLastRegexpId:Exception: ' + ex);
    } finally {
      this._closeStatement(statement);
    }
    return lastId;
  },



  //----------------------------------------------------------------------------
  // CleanUp DB Helper methods
  //----------------------------------------------------------------------------

  /**
   * Set a global dirty flag to indicate that the regexp-db has changed.
   */
  _setDirtyRegexpFlag: function() {
    var keyStore = "FhcGlobalRegexpListDirty";
    var ref = Application.storage.get(keyStore, "");
    if ("dirty" != ref) {
      Application.storage.set(keyStore, "dirty");
    }
  },

  /**
   * Open a database connection to the cleanup db.
   *
   * @param  transactional (boolean) [Optional]
   *         wether or not to start a transaction, default false (no transaction)
   *
   * @return {mozIStorageConnection}
   *         a databaseconnection to the database, null if connection failed
   */
  _getDbCleanupConnection: function(transactional) {
    var mDBConnection = null;
    if (!this._hasCheckedCleanupDB()) {
      mDBConnection = this._getDbFirstCleanupConnection();
    }
    else {
      mDBConnection = this.storageService.openDatabase(this.cleanupFile);
    }

    if (transactional && true == transactional) {
      // Start a transaction
      this._startTransaction(mDBConnection);
    }

    return mDBConnection;
  },

  /**
   * Open a database connection to the cleanup db.
   *
   * @return {mozIStorageConnection}
   *         a databaseconnection to the database, null if connection failed
   */
  _getDbFirstCleanupConnection: function() {
    var mDBConnection = null;

    try {
      var dbExist = this.cleanupFile.exists()
                    && this.cleanupFile.isFile()
                    && (0 < this.cleanupFile.fileSize);

      if (!dbExist) {
        // check if directory is writable
        var dir =  this.cleanupFile.parent;
        var isDirOkay = dir.exists() && dir.isDirectory() && dir.isReadable() && dir.isWritable();
        if (!isDirOkay) {
          dump('Directory [' + dir.path + '] for cleanup db is not fully accessible\n');
          return null;
        }
      }

      // openDatabase creates a zero length file if the db does not exist!
      mDBConnection = this.storageService.openDatabase(this.cleanupFile);

      var isOkay = true;
      // if not created before, create the database now
      if (!dbExist) {
        isOkay = this._createCriteriaTable(mDBConnection);
      }
      if (isOkay) {
        // check for old versions of criteria/regexp table, migrate if needed
        isOkay = this._checkCleanupVersion(mDBConnection);
      }

      // if everything is okay, no need to check database again
      this._setCheckedCleanupDB(isOkay);
    }
    catch(ex) {
      dump('Exception while making the first DbCleanup connection: ' + ex + '\n');
      mDBConnection = null;
    }

    return mDBConnection;
  },

  /**
   * Set the global state of the cleanup database.
   *
   * @param isChecked {boolean}
   *        true indicates the database is ready for use and does not need to be
   *        created or migrated.
   */
  _setCheckedCleanupDB: function(isChecked) {
    Application.storage.set("FhcCleanupDBSate", isChecked);
  },

  /**
   * Get the global state of the cleanup database.
   *
   * @return {boolean}
   *         wether or not the database is ready to be used.
   */
  _hasCheckedCleanupDB: function() {
    var globalState = Application.storage.get("FhcCleanupDBSate", false);
    return (true == globalState);
  },

  /**
   * Create the Criteria table for the Cleanup DB.
   *
   * @param  mDBConnection {mozIStorageConnection}
   *         the database connection
   *
   * @return {boolean}
   *         true if succeeded
   */
  _createCriteriaTable: function(mDBConnection) {
    try {
      mDBConnection.executeSimpleSQL(
        "CREATE TABLE IF NOT EXISTS criteria " +
        "(id INTEGER," +
        " fieldname TEXT," +
        " value TEXT," +
        " nameExact INTEGER," +
        " nameCase INTEGER," +
        " valueExact INTEGER," +
        " valueCase INTEGER," +
        " nameRegex INTEGER DEFAULT 0," +
        " valueRegex INTEGER DEFAULT 0," +
        " critType TEXT DEFAULT 'C'," +
        " description TEXT)"
      );
    }
    catch(e) {
      dump("Creating initial criteria table failed!\n\n" + e);
      return false;
    }
    return true;
  },

  /**
   * Check for old versions of criteria/regexp table, migrate if needed.
   *
   * @param mDBConnection {mozIStorageConnection}
   *        the database connection
   *
   * @return {boolean}
   *         true if succeeded
   */
  _checkCleanupVersion: function(mDBConnection) {
    // check criteria table
    var colCount = this._getNoOfColumns(mDBConnection, "criteria");
    if (7 == colCount) {
      // Upgrade from version 1.1.4
      dump("Migrate: Adding 4 column to the cleanupdb...\n");
      try {
        mDBConnection.executeSimpleSQL(
          "ALTER TABLE criteria" +
          "  ADD nameRegex INTEGER DEFAULT 0;" +
          "ALTER TABLE criteria" +
          "  ADD valueRegex INTEGER DEFAULT 0;" +
          "ALTER TABLE criteria" +
          "  ADD critType TEXT DEFAULT 'C';" +
          "ALTER TABLE criteria" +
          "  ADD description TEXT");
      }
      catch(e) {
        dump("Migrate: Adding 4 columns failed!\n\n" + e);
        return false;
      }
    }
    // check regexp table (new since 1.2.0)
    colCount = this._getNoOfColumns(mDBConnection, "regexp");
    if (0 == colCount) {
      try {
        mDBConnection.executeSimpleSQL(
          "CREATE TABLE IF NOT EXISTS regexp " +
          "(id          INTEGER," +
          " description TEXT," +
          " category    TEXT," +
          " regexp      TEXT," +
          " caseSens    INTEGER," +
          " useFor      TEXT," +
          " regexpType  TEXT)"
        );
      }
      catch(e) {
        dump("Migrate: Adding table regexp failed!\n\n" + e);
        return false;
      }
    }
    return true;
  },



  //----------------------------------------------------------------------------
  // Formhistory DB Helper methods
  //----------------------------------------------------------------------------

  /**
   * Open an existing database connection to the formhistory db.
   *
   * @param  transactional (boolean) [Optional]
   *         wether or not to start a transaction, default false (no transaction)
   *
   * @return {mozIStorageConnection}
   *         a databaseconnection to the database, null if connection failed
   */
  _getHistDbConnection: function(transactional) {
    var mDBConnection = Components.classes["@mozilla.org/satchel/form-history;1"]
            .getService(Components.interfaces.nsIFormHistory2)
            .DBConnection;

    if (transactional && true == transactional) {
      // Start a transaction
      this._startTransaction(mDBConnection);
    }

    return mDBConnection;
  },

  /**
   * End a database connection (without closing).
   *
   * @param mDBConnection{mozIStorageConnection}
   *        a databaseconnection to a database
   *
   * @param result {Boolean}
   *        state of the previous database action, if false transaction is
   *        rolled back, if true the transaction is committed
   */
  _endHistDbConnection: function(mDBConnection, result) {
    if (mDBConnection.transactionInProgress) {
      // end transaction
      this._endTransaction(mDBConnection, result);
    }
  },


  //----------------------------------------------------------------------------
  // Places DB Helper methods
  //----------------------------------------------------------------------------

  /**
   * Open a database connection to the places db. Does not need to be closed.
   *
   * @return {mozIStorageConnection}
   *         a databaseconnection to the database, null if connection failed
   */
  _getPlacesDbConnection: function() {
    var mDBConnection = Components.classes["@mozilla.org/browser/nav-history-service;1"]
            .getService(Components.interfaces.nsPIPlacesDatabase).DBConnection;
    return mDBConnection;
  },


  //----------------------------------------------------------------------------
  // General Helper methods
  //----------------------------------------------------------------------------

  /**
   * Close a database connection.
   *
   * @param mDBConnection{mozIStorageConnection}
   *        a databaseconnection to a database
   *
   * @param result {Boolean}
   *        state of the previous database action, if false transaction is
   *        rolled back, if true the transaction is committed
   */
  _closeDbConnection: function(mDBConnection, result) {
    if (mDBConnection.transactionInProgress) {
      // end transaction
      this._endTransaction(mDBConnection, result);
    }
    
    // close db connection
    mDBConnection.close();
    mDBConnection = null;
  },
  
  /**
   * Start a transaction.
   *
   * @param mDBConn {mozIStorageConnection}
   *        the database connection
   */
  _startTransaction: function(mDBConn) {
    if (!mDBConn.transactionInProgress) {
      mDBConn.beginTransactionAs(mDBConn.TRANSACTION_DEFERRED);
    }
  },

  /**
   * End a transaction.
   *
   * @param mDBConn {mozIStorageConnection}
   *        the database connection
   *
   * @param result {Boolean}
   *        whether or not to commit the transaction, if false transaction is
   *        rolled back, if true the transaction is committed
   */
  _endTransaction: function(mDBConn, result) {
    if (!result) {
      mDBConn.rollbackTransaction();
    } else {
      mDBConn.commitTransaction();
    }
  },
  
  /**
   * Execute a SQL statement, no resultset is returned. Return true on
   * succes, false when an error occurred.
   *
   * @param  statement {String}
   *         the SQL statement to be executed
   * 
   * @return {Boolean}
   *         whether or not the exucation of the SQL statment succeeded
   */
  _executeStatement: function(statement) {
    var result = false;
    try {
      statement.executeStep();
      result = true;
    } catch(ex) {
      dump('_executeStatement:Exception: ' + ex);
    } finally {
      this._closeStatement(statement);
    }
    return result;
  },
  
  /**
   * Execute a prepared SQL statement, no resultset is returned. Return true on
   * succes, false when an error occurred. Do not forget to call
   * _closeStatement() afterwards!
   *
   * @param  statement {String}
   *         the SQL statement to be executed (multiple times)
   *
   * @return {Boolean}
   *         whether or not the exucation of the SQL statment succeeded
   */
  _executeReusableStatement: function(statement) {
    var result = false;
    try {
      statement.execute();
      result = true;
    } catch(ex) {
      dump('_executeReusableStatement:Exception: ' + ex);
    } finally {
    }
    return result;
  },
  
  /**
   * Reset and finalize a statment.
   *
   * @param statement {String}
   *        the SQL reusable statement
   */
  _closeStatement: function(statement) {
    if (statement) {
      try {
        statement.reset();
      } catch(ex) {
        dump('_closeStatement::reset Exception: ' + ex);
      }
      try {
        statement.finalize();
      } catch(ex) {
        dump('_closeStatement::finalize Exception: ' + ex);
      }
    }
  },

  /**
   * Get the no of columns of a table.
   *
   * @param {mozIStorageConnection} mDBConn
   *        a databaseconnection to a database
   *
   * @param {String} tableName
   *        the name of the table to inspect
   *
   * @return {Number}
   *         the no of columns in the table
   */
  _getNoOfColumns: function(mDBConn, tableName) {
    var count = 0, statement;
    try {
      statement = mDBConn.createStatement("PRAGMA table_info(" + tableName + ");");
      //dump("\n\n\nColumns: ");
      while (statement.executeStep()) {
        count++;
        // statement contains: #, columnName, dataType, nullableFlag?, defaultValue, xxxFlag?
        //dump("" + statement.getUTF8String(1) + ", ");
      }
      //dump("\n")
    } catch(ex) {
      dump('_getNoOfColumns:Exception: ' + ex);
    } finally {
      this._closeStatement(statement);
    }
    return count;
  }
}
