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
 * The Original Code is FhcBrowseHistoryDialog.
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
 * Methods for the form history edit dialog.
 * Only used within FhcEntryDialog.xul, thus no danger of namespace conflicts.
 *
 * Dependencies: FhcBrowseHistoryDialog.xul, FhcDbHandler.js,
 *               FhcBundle.js, FhcDateHandler.js, FhcUtil.js
 *
 */
const FhcBrowseHistoryDialog = {
  LOOKUP_COUNT:  10,
  dbHandler:     null,
  bundle:        null,
  dateHandler:   null,
  currentDate:   null,
  lastHistDate:  null,
  firstHistDate: null,

  /**
   * Initialize dialog.
   */
  init: function() {
    //var what = window.arguments[0].what;
    var fieldName  = window.arguments[0].fieldName;
    var fieldValue = window.arguments[0].fieldValue;
    var dateUsed   = window.arguments[0].date;

    this.bundle = new FhcBundle();
    this.dbHandler = new FhcDbHandler();
    this.dateHandler = new FhcDateHandler(this.bundle);

    this.currentDate = dateUsed;
    this.lastHistDate = dateUsed;
    this.firstHistDate = dateUsed;

    this.setFieldInfo(fieldName, fieldValue, dateUsed);
    this.getOlder();
    //this.getNewer();

    var report = document.getElementById("browsereport");
    var reportDoc = report.contentWindow.document;
    reportDoc.getElementById("newer").scrollIntoView(true);
  },

  /**
   * Dialog closes, cleanup.
   */
  destroy: function() {
    delete this.dateHandler;
    delete this.bundle;
    delete this.dbHandler;
    return true;
  },

  /**
   * Get additional older history.
   */
  getOlder: function() {
    var report = document.getElementById("browsereport");
    var reportDoc = report.contentWindow.document;

    // get pages visited before the field was submitted
    var places = this.dbHandler.getVisitedPlaces(this.lastHistDate, this.LOOKUP_COUNT);
    if (places.length > 0) {
      var parent = reportDoc.getElementById("older");
      for (var ii=0; ii<places.length; ii++) {
        parent.appendChild(this._getPlaceInfo(reportDoc, "older", places[ii]));
      }
      this.lastHistDate = places[places.length-1].date;
      parent.lastChild.scrollIntoView(true);
    }
  },

  /**
   * Get additional newer history.
   */
  getNewer: function() {
    var report = document.getElementById("browsereport");
    var reportDoc = report.contentWindow.document;

    // get pages visited after the field was submitted
    var places = this.dbHandler.getVisitedPlacesAfter(this.firstHistDate, this.LOOKUP_COUNT);
    if (places.length > 0) {
      var parent = reportDoc.getElementById("newer");
      for (var ii=0; ii<places.length; ii++) {
        parent.insertBefore(
          this._getPlaceInfo(reportDoc, "newer", places[ii]),
          parent.firstChild
        );
      }
      this.firstHistDate = places[places.length-1].date;
      parent.firstChild.scrollIntoView(true);
    }
  },

  /**
   * Set the formfield info.
   *
   * @param fieldName {String}
   * @param fieldValue {String}
   * @param dateUsed {Integer}
   */
  setFieldInfo: function(fieldName, fieldValue, dateUsed) {
    var report = document.getElementById("browsereport");
    var reportDoc = report.contentWindow.document;

    var datetime = reportDoc.getElementById("datetime");
    datetime.innerHTML = this.dateHandler.toDateString(dateUsed);

    var fieldname = reportDoc.getElementById("fieldname");
    fieldname.innerHTML = fieldName;

    var fieldvalue = reportDoc.getElementById("fieldvalue");
    fieldvalue.innerHTML = fieldValue;

    //localization navigation buttons
    this._setLocaleString("gocurrent");
    this._setLocaleString("hideurl");
    this._setLocaleString("showurl");
    this._setLocaleString("hidehost");
    this._setLocaleString("showhost");
    this._setLocaleString("hidetitle");
    this._setLocaleString("showtitle");

    //localization report
    this._setLocaleString("fieldnamelabel");
    this._setLocaleString("valuelabel");
    this._setLocaleString("titlelabel");
    this._setLocaleString("hostlabel");
    this._setLocaleString("urllabel");
  },

  /**
   * Set the locale string of an html element inside the iframe document.
   * @param code {String]
   *        the code used for both elementId as well as bundle lookup key.
   */
  _setLocaleString: function(code) {
    var element = document.getElementById("browsereport")
                    .contentDocument.getElementById(code);
    if (element) {
      element.innerHTML = this.bundle.getString("browsehistorywindow.report." + code);
    }
  },

  /**
   * Get the place info inside a div.
   *
   * @param doc {Document}
   * @param type {String}
   * @param place {Object}
   * 
   * @return {Element} placeinfo
   */
  _getPlaceInfo: function(doc, type, place) {
    var template = doc.getElementById("placetemplate");
    var box = template.cloneNode(true);
    box.className = "box " + type;
    box.getElementsByClassName("datetime")[0].innerHTML = this.dateHandler.toDateString(place.date);

    var fuzzyage;
    if ("older" == type) {
      fuzzyage = this.dateHandler.getFuzzyAge(this.currentDate, place.date);
    } else {
      fuzzyage = this.dateHandler.getFuzzyAge(place.date, this.currentDate);
    }
    box.getElementsByClassName("fuzzyage")[0].innerHTML = "(" + fuzzyage.trimLeft() + ")";

    box.getElementsByClassName("placehost")[0].innerHTML = place.host;
    box.getElementsByClassName("placetitle")[0].innerHTML = place.title;
    box.getElementsByClassName("placeurl")[0].innerHTML = place.url;
    return box;
  }
}