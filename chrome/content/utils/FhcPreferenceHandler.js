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
 * The Original Code is FhcPreferenceHandler.
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
 * Preference handling convenience methods.
 *
 * Dependencies: -
 */
function FhcPreferenceHandler() {
  this.prefService = Components.classes["@mozilla.org/preferences-service;1"]
           .getService(Components.interfaces.nsIPrefService)
           .getBranch("extensions.formhistory.");
}

FhcPreferenceHandler.prototype = {

  isHideLoginmanagedFields: function() {
    return this.prefService.getBoolPref("hideLoginmanagedFields");
  },
  
  isDefaultSearchCurrentPageChecked: function() {
    return this.prefService.getBoolPref("defaultSearchCurrentPageChecked");
  },
  
  isSearchCaseSensitive: function() {
    return this.prefService.getBoolPref("searchCaseSensitive");
  },
  setSearchCaseSensitive: function(newBoolPref) {
    this.prefService.setBoolPref("searchCaseSensitive", newBoolPref);
  },
  
  isWarnOnDeleteOne: function() {
    return this.prefService.getBoolPref("warnOnDeleteOne");
  },
  setWarnOnDeleteOne: function(newBoolPref) {
    this.prefService.setBoolPref("warnOnDeleteOne", newBoolPref);
  },
  
  isWarnOnDeleteMultiple: function() {
    return this.prefService.getBoolPref("warnOnDeleteMultiple");
  },
  setWarnOnDeleteMultiple: function(newBoolPref) {
    this.prefService.setBoolPref("warnOnDeleteMultiple", newBoolPref);
  },

  getExclusions: function() {
    var exclString = this.prefService.getCharPref("exclusions");
    var exclArray = exclString.match(/\b\S+\b/g);
    if (null == exclArray) return [];
    return exclArray;
  },

  getLastUsedExportFilename: function() {
    return this.prefService.getCharPref("lastUsedExportFilename");
  },
  setLastUsedExportFilename: function(newFilename) {
    this.prefService.setCharPref("lastUsedExportFilename", newFilename);
  },

  getLastUsedCSVExportFilename: function() {
    return this.prefService.getCharPref("lastUsedCSVExportFilename");
  },
  setLastUsedCSVExportFilename: function(newFilename) {
    this.prefService.setCharPref("lastUsedCSVExportFilename", newFilename);
  },

  getLastUsedCleanupExportFilename: function() {
    return this.prefService.getCharPref("lastUsedCleanupExportFilename");
  },
  setLastUsedCleanupExportFilename: function(newFilename) {
    this.prefService.setCharPref("lastUsedCleanupExportFilename", newFilename);
  },

  isCleanupDaysChecked: function() {
    return this.prefService.getBoolPref("cleanupDaysChecked");
  },
  setCleanupDaysChecked: function(newBoolPref) {
    return this.prefService.setBoolPref("cleanupDaysChecked", newBoolPref);
  },

  getCleanupDays: function() {
    return this.prefService.getIntPref("cleanupDays");
  },
  setCleanupDays: function(newIntPref) {
    return this.prefService.setIntPref("cleanupDays", newIntPref);
  },

  isCleanupTimesChecked: function() {
    return this.prefService.getBoolPref("cleanupTimesChecked");
  },
  setCleanupTimesChecked: function(newBoolPref) {
    return this.prefService.setBoolPref("cleanupTimesChecked", newBoolPref);
  },

  getCleanupTimes: function() {
    return this.prefService.getIntPref("cleanupTimes");
  },
  setCleanupTimes: function(newIntPref) {
    return this.prefService.setIntPref("cleanupTimes", newIntPref);
  },

  isCleanupOnShutdown: function() {
    return this.prefService.getBoolPref("cleanupOnShutdown");
  },
  setCleanupOnShutdown: function(newBoolPref) {
    return this.prefService.setBoolPref("cleanupOnShutdown", newBoolPref);
  },

  isCleanupOnTabClose: function() {
    return this.prefService.getBoolPref("cleanupOnTabClose");
  },
  setCleanupOnTabClose: function(newBoolPref) {
    return this.prefService.setBoolPref("cleanupOnTabClose", newBoolPref);
  },

  isUseCustomDateTimeFormat: function() {
    return this.prefService.getBoolPref("useCustomDateTimeFormat");
  },

  getCustomDateTimeFormat: function() {
    return this.prefService.getCharPref("customDateTimeFormat");
  },

  isTaskbarVisible: function() {
    return this.prefService.getBoolPref("showStatusBarIcon");
  },

  isToolsmenuHidden: function() {
    return this.prefService.getBoolPref("hideToolsMenuItem");
  },
  setToolsmenuHidden: function (newBoolPref) {
    return this.prefService.setBoolPref("hideToolsMenuItem", newBoolPref);
  },

  isContextmenuHidden: function() {
    return this.prefService.getBoolPref("hideContextMenuItem");
  },
  setContextmenuHidden: function (newBoolPref) {
    return this.prefService.setBoolPref("hideContextMenuItem", newBoolPref);
  },

  getCSVSeparator: function() {
    return this.prefService.getCharPref("exportCSV.separator");
  },
  getCSVQuote: function() {
    return this.prefService.getCharPref("exportCSV.quote");
  },
  getCSVEscapePrefix: function() {
    return this.prefService.getCharPref("exportCSV.escape");
  },

  isQuickFillChangeBgColor: function() {
    return this.prefService.getBoolPref("quickfill.changebgcolor");
  },
  isQuickFillChangeBrdrColor: function() {
    return this.prefService.getBoolPref("quickfill.changebordrcolor");
  },
  isQuickFillChangeBrdrThickness: function() {
    return this.prefService.getBoolPref("quickfill.changebordrthickness");
  },

  getQuickFillChangeBgColor: function() {
    return this.prefService.getCharPref("quickfill.bgcolor");
  },
  getQuickFillChangeBrdrColor: function() {
    return this.prefService.getCharPref("quickfill.bordrcolor");
  },
  getQuickFillChangeBrdrThickness: function() {
    return this.prefService.getIntPref("quickfill.bordrthickness");
  },


  setKeybindingValue: function(id, stringData) {
    return this.prefService.setComplexValue(
      "keybinding." + id,
      Components.interfaces.nsISupportsString,
      this._getUnicodeString(stringData)
    );
  },
  getKeybindingValue: function(id) {
    return this.prefService.getComplexValue(
      "keybinding." + id,
      Components.interfaces.nsIPrefLocalizedString
    )
  },

  //----------------------------------------------------------------------------
  // Global preferences (FireFox's options)
  //----------------------------------------------------------------------------
  isGlobalRememberFormEntriesActive: function() {
    var prefServiceFF = Components.classes["@mozilla.org/preferences-service;1"]
           .getService(Components.interfaces.nsIPrefService)
           .getBranch("browser.formfill.");
    return prefServiceFF.getBoolPref("enable");
  },


  // Create an Unicode String
  _getUnicodeString: function(stringData) {
    var str = Components.classes['@mozilla.org/supports-string;1']
                .createInstance(Components.interfaces.nsISupportsString);
    // Set the String value:
    str.data = stringData;
    // Return the Unicode String:
    return str;
  }
}