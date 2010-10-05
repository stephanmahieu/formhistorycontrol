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
 * The Original Code is FhcPreferences.
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
 * Methods for the form history preferences dialog.
 * Only used within FhcPreferences.xul.
 *
 * Dependencies:
 *    FhcPreferences.xul, FhcPreferenceHandler.js, FhcDbHandler.js
 *    FhcRdfExtensionHandler.js, FhcUtil.js, FhcBundle.js,
 *    FhcCleanupFilter.js, FhcDateHandler.js
 */
const FhcPreferences = {
  prefHandler:   null,
  dbHandler:     null,
  extHandler:    null,
  bundle:        null,
  dateHandler:   null,
  cleanupFilter: null,
  timer:         null,

  /*
   * Initialize on preference window startup.
   */
  init: function() {
    this.prefHandler   = new FhcPreferenceHandler();
    this.dbHandler     = new FhcDbHandler();
    this.extHandler    = new FhcRdfExtensionHandler();
    this.bundle        = new FhcBundle();
    this.dateHandler   = new FhcDateHandler(this.bundle);
    this.cleanupFilter = new FhcCleanupFilter(
                                this.prefHandler,
                                this.dbHandler,
                                this.dateHandler);

    this.fillInformationPanel();
    this.adjustQuickFillPreview();
    this.toggleCustomDateFormatList();
    this.initCleanupPanel();
    
    FhcRegexpView.init(
      this.dbHandler, this.bundle);

    if ("arguments" in window && window.arguments.length > 0) {
      if (window.arguments[0]) {
        // parameters only used for regexp pane, always select this pane if arguments
        var prefPane = document.getElementById("regexp");
        var prefWin = document.getElementById("formhistoryPrefs");
        prefWin.showPane(prefPane);
        FhcRegexpView.setFilter(window.arguments[0]);
      }
    }
  },

  /**
   * Preference window closes, cleanup
   */
  destroy: function() {
    if (this.timer != null) this.timer.cancel();
    FhcRegexpView.destroy();
    delete this.cleanupFilter;
    delete this.dateHandler;
    delete this.bundle;
    delete this.extHandler;
    delete this.dbHandler;
    delete this.prefHandler;
    return true;
  },

  /**
   * Show or hide the taskbar icon.
   *
   * @param elmCheckbox {checkbox}
   */
  showOrHideTaskbarIcon: function(elmCheckbox) {
    var doc = this._getParentDocument();
    var menuElem = doc.getElementById("formhistctrl-statusbarmenu");

    if (elmCheckbox.checked) {
      menuElem.removeAttribute("hidden");
    } else {
      menuElem.setAttribute("hidden", true);
    }
  },

  /**
   * Adjust the preview to reflect changes to notification-preferences.
   */
  adjustQuickFillPreview: function() {
    var elem = document.getElementById("preview");

    var cssStyle = "width: 6em; height: 1.2em;\n" +
                   "display: inline-block;\n" +
                   "border-style: inset !important;\n" +
                   "padding: 1px 2px;\n";

    if (document.getElementById("changebgcolor").checked) {
      cssStyle += "background-color: " + document.getElementById("bgcolor").color + ";\n";
      document.getElementById("bgcolor").disabled = false;
    } else {
      cssStyle += "background-color: #FFFFFF;\n";
      document.getElementById("bgcolor").color = "#CCCCCC";
      document.getElementById("bgcolor").disabled = true;
    }

    if (document.getElementById("changebordrcolor").checked) {
      cssStyle += "border-color: " + document.getElementById("brdcolor").color + ";\n";
      document.getElementById("brdcolor").disabled = false;
    } else {
      cssStyle += "border-color: #999999;\n";
      document.getElementById("brdcolor").color = "#CCCCCC";
      document.getElementById("brdcolor").disabled = true;
    }

    if (document.getElementById("changebordrthickness").checked) {
      cssStyle += "border-width: " + document.getElementById("brdsize").value + "px;\n";
      document.getElementById("brdsize").disabled = false;
    } else {
      cssStyle += "border-width: 2px;\n";
      document.getElementById("brdsize").disabled = true;
    }

    elem.setAttribute("style", cssStyle);
  },

  /**
   * Set some information in the display panel.
   */
  fillInformationPanel: function() {
    var appVersion = this.extHandler.getVersion();
    document.getElementById("appversion").value =
                  this.bundle.getString("prefwindow.information.fhcversion.label", [appVersion]);

    document.getElementById("moz-location").value = this.dbHandler.formHistoryFile.path;
    document.getElementById("moz-size").value = this.dbHandler.formHistoryFile.fileSize + " bytes";
    document.getElementById("moz-datacount").value = this.dbHandler.getNoOfItems();
    
    document.getElementById("fhc-location").value = this.dbHandler.cleanupFile.path;
    try {
      document.getElementById("fhc-size").value = this.dbHandler.cleanupFile.fileSize + " bytes";
      document.getElementById("fhc-datacount").value =
        "criteria::" + this.dbHandler.getNoOfCleanupAndProtectItems() + "  " +
        "regexp::" + this.dbHandler.getNoOfRegexpItems();
    }
    catch(ex) {
      // when preferences is shown but the extension itself has never been opened yet,
      // the cleanupFile does not exist yet causing an exception reading the  fileSize .
    }
  },

  /**
   * Enable/disable textbox according to checkbox status.
   */
  initCleanupPanel: function() {
    document.getElementById("lastUsedDaysLimit").disabled = !document.getElementById("lastUsedCheck").checked;
    document.getElementById("timesUsedLimit").disabled = !document.getElementById("timesUsedCheck").checked;
  },

  cleanupPrefChecked: function(domElem) {
    switch (domElem.id) {
      case "lastUsedCheck":
        document.getElementById("lastUsedDaysLimit").disabled = !domElem.checked;
        break;
      case "timesUsedCheck":
        document.getElementById("timesUsedLimit").disabled = !domElem.checked;
        break;
    }
  },

  /**
   * Enable or disable the custom dateformat selector
   */
  toggleCustomDateFormatList: function() {
    var useCustom = document.getElementById("useCustomDateTimeFormat").checked
    document.getElementById("customDateTimeFormatList").disabled = !useCustom;
    document.getElementById("infoimage").hidden = !useCustom;
    
    var toolTip = document.getElementById("customDateFormatHelp");
    if (!useCustom && "open" == toolTip.state) {
      toolTip.hidePopup();
    }
  },

  /**
   * Popup/Hide the CustomDateFormat information tooltip.
   */
  showCustomDateFormatInfo: function() {
    var toolTip = document.getElementById("customDateFormatHelp");
    if ("open" == toolTip.state) {
      toolTip.hidePopup();
    } else {
      var anchorElem = document.getElementById("customDateBox");
      toolTip.openPopup(anchorElem, "before_start", 30, 0, false, false);
      var _this = this;
      toolTip.addEventListener("click", _this.hideTooltipPopup, false);
    }
  },

  /**
   * Hide the tooltip popup.
   */
  hideTooltipPopup: function() {
    var toolTip = document.getElementById("customDateFormatHelp");
    toolTip.hidePopup();
  },

  /**
   * Re-Create the CleanUp database optionally preserving existing data.
   *
   * @param preserveData {boolean}
   *        try to preserve existing data (uses xml-export/import).
   */
  recreateCleanupDb: function(preserveData) {
    // ask user confitmation
    if (!preserveData) {
      var answer = FhcUtil.confirmDialog(
        this.bundle.getString("prefwindow.prompt.recreate.title"),
        this.bundle.getString("prefwindow.prompt.recreate.confirm"), "");
      if (!answer.isOkay) {
        return;
      }
    }

    var dirServiceProp = Components.classes["@mozilla.org/file/directory_service;1"]
                           .getService(Components.interfaces.nsIProperties);
    var oldDbfile = dirServiceProp.get("ProfD", Components.interfaces.nsIFile);
    oldDbfile.append("cleanup.sqlite");

    var okay = false;
    try {
      // export contents in order to preserve existing data
      if (preserveData) {
        var exportFile = dirServiceProp.get("ProfD", Components.interfaces.nsIFile);
        exportFile.append("cleanup.sqlite.backup.xml");
        FhcUtil.exportCleanupFile(exportFile, this.dbHandler, this.prefHandler, this.dateHandler);
      }
      
      // rename databasefile
      oldDbfile.moveTo(null, "cleanup.sqlite.org");

      // Re-Create by triggering a lookup (and set checked flag to false)
      Application.storage.set("FhcCleanupDBSate", false);
      this.dbHandler.getNoOfCleanupAndProtectItems();

      // check presence of re-created file
      var newDbFile = dirServiceProp.get("ProfD", Components.interfaces.nsIFile);
      newDbFile.append("cleanup.sqlite");
      okay = newDbFile.exists();

      // import the xml data backup
      if (okay && preserveData) {
        var cleanupConfig = FhcUtil.importCleanupFile(exportFile, this.prefHandler, this.dateHandler);
        if (cleanupConfig && cleanupConfig.cleanup) {
          this.dbHandler.bulkAddCleanupCriteria(cleanupConfig.cleanup);
        }
        if (cleanupConfig && cleanupConfig.protect) {
          this.dbHandler.bulkAddProtectCriteria(cleanupConfig.protect);
        }
        if (cleanupConfig && cleanupConfig.regexp) {
          this.dbHandler.bulkAddRegexp(cleanupConfig.regexp);
        }
      }
    }
    finally {
      if (okay) {
        // remove backup
        oldDbfile.remove(false /* not recursive */);
        // remove data-backup (xml)
        if (preserveData) {
          exportFile.remove(false /* not recursive */);
        }
      } else {
        // restore backup
        oldDbfile.moveTo(null, "cleanup.sqlite");
      }

      // Notify HistoryWindow of DB-changes
      Components.classes["@mozilla.org/observer-service;1"]
                .getService(Components.interfaces.nsIObserverService)
                .notifyObservers(null, "cleanup-db-changed", "");
    }
    this.fillInformationPanel();

    var statusText = "";
    if (okay) {
      statusText = this.bundle.getString("prefwindow.recreate.status.okay");
    } else {
      statusText = this.bundle.getString("prefwindow.recreate.status.failed");
    }
    var statusLbl = document.getElementById("recreate-status-text");
    var statusBox = document.getElementById("recreate-status");

    // display statusbox for max. 10 seconds
    statusLbl.value = statusText
    statusBox.height = 2;
    statusBox.collapsed = false;
    this._showRecreateStatus();
  },

  /**
   * Restore the builtin Regular Expressions.
   */
  restoreRegexp: function() {
    // delete old (not modified by user)
    this.dbHandler.deleteBuiltinRegexp();

    // get an array of all predefined regexps
    var predefHandler = new FhcPredefinedRegexp(this.dbHandler, this.bundle);
    var defRegexp = predefHandler.getPredefinedRegexp();

    // check for duplicates (may be the same as user-defined regexp)
    var uniqueRegexp = [], exist;
    var curRegexps = this.dbHandler.getAllRegexp();
    for (var jj=0; jj<defRegexp.length; jj++) {
      for (var ii=0; ii<curRegexps.length; ii++) {
        exist = ((defRegexp[jj].regexp   == curRegexps[ii].regexp) &&
                 (defRegexp[jj].caseSens == curRegexps[ii].caseSens));
        if (exist) break;
      }
      if (!exist) {
        uniqueRegexp.push(defRegexp[jj]);
      }
    }
    curRegexps = null;
    defRegexp = null;

    // add unique regexp
    this.dbHandler.bulkAddRegexp(uniqueRegexp);

    // display status
    var statusText = this.bundle.getString("prefwindow.cleanup.status.regexp",
                                           [uniqueRegexp.length])
    var statusLbl = document.getElementById("recreate-status-text");
    var statusBox = document.getElementById("recreate-status");

    // display statusbox for max. 10 seconds
    statusLbl.value = statusText
    statusBox.height = 2;
    statusBox.collapsed = false;
    this._showRecreateStatus();

    uniqueRegexp = null;

    // repopulate the regexp view
    FhcRegexpView.rePopulate();
  },

  /**
   * Cleanup the formhistory database.
   */
  cleanupFormhistoryNow: function() {
    var delEntries = [];

    document.getElementById("button-now").hidden = true;

    var allEntries = this.dbHandler.getAllEntries();
    if (allEntries && allEntries.length > 0) {
      delEntries = this.cleanupFilter.getMatchingEntries(allEntries);
      if (delEntries && delEntries.length > 0) {
        if (this.dbHandler.deleteEntries(delEntries)) {
          this._notifyStoreChanged();
        }
      }
    }

    var statusText = "";
    if (delEntries && 0 < delEntries.length) {
      statusText = this.bundle.getString("prefwindow.cleanup.status.deleted", [delEntries.length])
    } else {
      statusText = this.bundle.getString("prefwindow.cleanup.status.nothingdeleted");
    }
    var statusLbl = document.getElementById("status-text");
    var statusBox = document.getElementById("cleanup-status");

    // display statusbox for max. 10 seconds
    statusLbl.value = statusText
    statusBox.height = 2;
    statusBox.collapsed = false;
    this._showCleanupStatus();

    delEntries = null;
    allEntries = null;
  },

  /**
   * Fade-in the statusbox.
   */
  _showCleanupStatus: function() {
    var elem = document.getElementById("cleanup-status");

    var newHeight = FhcPreferences._getElemHeight(elem) + 1;
    if (newHeight <= 24) {
      // expand
      elem.height = newHeight;
      FhcPreferences._runAfterTimeout(FhcPreferences._showCleanupStatus, 15);
    }
    else {
      // auto hide after 10 seconds
      elem.height = 26;
      FhcPreferences._runAfterTimeout(FhcPreferences.hideCleanupStatus, 10000);
    }
  },

  /**
   * Fade-out the statusbox.
   */
  hideCleanupStatus: function() {
    var elem = document.getElementById("cleanup-status");

    var newHeight = FhcPreferences._getElemHeight(elem) - 2;
    if (newHeight <= 1) {
      // hide and restore height
      elem.collapsed = true;
      elem.height = 26;
      // enable cleanup button
      document.getElementById("button-now").hidden = false;
    }
    else {
      // collapse
      elem.height = newHeight;
      FhcPreferences._runAfterTimeout(FhcPreferences.hideCleanupStatus, 15);
    }
  },

  /**
   * Fade-in the recreate statusbox.
   */
  _showRecreateStatus: function() {
    var elem = document.getElementById("recreate-status");

    var newHeight = FhcPreferences._getElemHeight(elem) + 1;
    if (newHeight <= 24) {
      // expand
      elem.height = newHeight;
      FhcPreferences._runAfterTimeout(FhcPreferences._showRecreateStatus, 15);
    }
    else {
      // auto hide after 10 seconds
      elem.height = 26;
      FhcPreferences._runAfterTimeout(FhcPreferences.hideRecreateStatus, 10000);
    }
  },


  /**
   * Fade-out the recreate statusbox.
   */
  hideRecreateStatus: function() {
    var elem = document.getElementById("recreate-status");

    var newHeight = FhcPreferences._getElemHeight(elem) - 2;
    if (newHeight <= 1) {
      // hide and restore height
      elem.collapsed = true;
      elem.height = 26;
      // enable cleanup button
      document.getElementById("button-now").hidden = false;
    }
    else {
      // collapse
      elem.height = newHeight;
      FhcPreferences._runAfterTimeout(FhcPreferences.hideRecreateStatus, 15);
    }
  },

  /**
   * Open the edit regexp SubDialog.
   *
   * @param params {Array}
   *        array of input/output parameters
   */
  showFhcEditRegexp: function(params) {
    var prefWin = document.getElementById("formhistoryPrefs");
    prefWin.openSubDialog(
      "chrome://formhistory/content/FhcRegexpDialog.xul",
      "chrome, dialog, modal, resizable=yes", params)
    .focus();
  },

  /**
   * Get the height of an element.
   *
   * @param  elem {DOM Element}
   *         the XIL element
   *         
   * @return {Number}
   *         the height of the element
   * 
   */
  _getElemHeight: function(elem) {
    var height = elem.height;
    if ("" == height) {
      height = elem.clientHeight;
    }
    return parseInt(height, 10);
  },

  /**
   * Send notification to observers that the formhistory store has changed.
   */
  _notifyStoreChanged: function() {
    var observerService = Components.classes["@mozilla.org/observer-service;1"]
                            .getService(Components.interfaces.nsIObserverService);
    observerService.notifyObservers(null, "sessionstore-state-write", "");
  },


  /**
   * Get the root document.
   * @return {DOM} the root document
   */
  _getParentDocument: function() {
    var theOpener;

    // get the root-parent
    for (theOpener = window.opener; (theOpener.opener); ) {
      theOpener = theOpener.opener;
    }
    
    return theOpener.document;
  },

  /**
   * Invoke a callBackFunction after a specified no of milliseconds.
   *
   * @param callBackFunc {Function}
   * @param timeMillisec {Number}
   * 
   */
  _runAfterTimeout: function(callBackFunc, timeMillisec) {
    var event = {
      notify: function(timer) {callBackFunc();}
    }

    if (this.timer == null) {
      this.timer = Components.classes["@mozilla.org/timer;1"]
                    .createInstance(Components.interfaces.nsITimer);
    } else {
      this.timer.cancel();
    }
    this.timer.initWithCallback(
       event,
       timeMillisec,
       Components.interfaces.nsITimer.TYPE_ONE_SHOT);
  }
}