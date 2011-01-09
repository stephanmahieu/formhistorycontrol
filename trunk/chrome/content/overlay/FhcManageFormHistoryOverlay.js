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
 * The Original Code is FhcBrowserListener.
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
 * Provide load and unload event handlers.
 *
 * Dependencies:
 *   FhcManageFormHistoryOverlay.js
 */

var FhcManageFormHistoryOverlayListener = {
  QueryInterface: function(aIID) {
   if (aIID.equals(Components.interfaces.nsIWebProgressListener) ||
       aIID.equals(Components.interfaces.nsISupportsWeakReference) ||
       aIID.equals(Components.interfaces.nsISupports))
     return this;
   throw Components.results.NS_NOINTERFACE;
  },

  onLocationChange: function(aProgress, aRequest, aURI) {
    FhcManageFormHistoryOverlay.processNewURL(aURI);
  },

  onStateChange: function(a, b, c, d) {},
  onProgressChange: function(a, b, c, d, e, f) {},
  onStatusChange: function(a, b, c, d) {},
  onSecurityChange: function(a, b, c) {}
};

const FhcManageFormHistoryOverlay = {
  prefHandler: null,
  dbHandler: null,
  oldURL: null,

  init: function() {
    this.prefHandler = new FhcPreferenceHandler();
    this.dbHandler   = new FhcDbHandler();
    window.addEventListener("submit", function() {
      FhcManageFormHistoryOverlay.onFormSubmit()
    }, false);
    gBrowser.addProgressListener(FhcManageFormHistoryOverlayListener);
  },

  destroy: function() {
    gBrowser.removeProgressListener(FhcManageFormHistoryOverlayListener);
    delete this.dbHandler;
    delete this.prefHandler;
  },

  /**
   *
   */
  processNewURL: function(aURI) {
    if (aURI.spec == "about:blank" || aURI.spec == this.oldURL)
      return;
    this.oldURL = aURI.spec;
    
    dump("\n=== processNewURL ===\n");
    dump("- URL current tab = [" + aURI.spec + "]\n");
    if (this.prefHandler.isManageHistoryByFHCEnabled()) {
      dump("- ManageByFHC is enabled.\n");
      
      //TODO set icon to indicate formfill status of page (with menu to add/remove from list)
    }
  },

  /**
   *
   */
  onFormSubmit: function() {
    dump("\n=== onFormSubmit ===\n");
    if (this.prefHandler.isManageHistoryByFHCEnabled()) {
      dump("- ManageByFHC is enabled.\n");
      var browser = gBrowser.selectedBrowser;

      dump("- Checking if 'remember formhistory' should be enabled...\n");
      dump("- URL current tab = [" + browser.currentURI.spec + "]\n");

      var prefServiceFF = Components.classes["@mozilla.org/preferences-service;1"]
                            .getService(Components.interfaces.nsIPrefService)
                            .getBranch("browser.formfill.");
      var doSaveFormhistory = prefServiceFF.getBoolPref("enable");
      dump("- Current setting Mozilla formfill.enable=" + doSaveFormhistory + "\n");
//      prefServiceFF.setBoolPref("enable", false);
//
//      doSaveFormhistory = prefServiceFF.getBoolPref("enable");
//      dump("- New setting Mozilla formfill.enable=" + doSaveFormhistory + "\n");
//TODO also implement this for the search-bar

      dump("\n");
    }
  }
}

// call handleEvent method for the following events:
window.addEventListener("load",
  function() {
    FhcManageFormHistoryOverlay.init();
    removeEventListener("load", arguments.callee, false);
  },
  false
);

window.addEventListener("unload",
  function() {
    FhcManageFormHistoryOverlay.destroy();
    removeEventListener("unload", arguments.callee, false);
  },
  false
);