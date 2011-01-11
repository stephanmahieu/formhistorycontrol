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
    FhcManageFormHistoryOverlay.onSelectNewURL(aURI);
  },

  onStateChange: function(a, b, c, d) {},
  onProgressChange: function(a, b, c, d, e, f) {},
  onStatusChange: function(a, b, c, d) {},
  onSecurityChange: function(a, b, c) {}
};

const FhcManageFormHistoryOverlay = {
  prefHandler: null,
  dbHandler: null,
  extPreferenceListener: null,
  mozPreferenceListener: null,
  oldURL: null,
  submitting: false,

  init: function() {
    this.prefHandler = new FhcPreferenceHandler();
    this.dbHandler   = new FhcDbHandler();
    window.addEventListener("submit", function() {
      FhcManageFormHistoryOverlay.onFormSubmit()
    }, false);
    gBrowser.addProgressListener(FhcManageFormHistoryOverlayListener);
    this.extPreferenceListener = this.registerExtPrefListener();
    this.mozPreferenceListener = this.registerMozPrefListener();
  },

  destroy: function() {
    gBrowser.removeProgressListener(FhcManageFormHistoryOverlayListener);
    delete this.dbHandler;
    delete this.prefHandler;

    this.extPreferenceListener.unregister();
    delete this.extPreferenceListener;
    
    this.mozPreferenceListener.unregister();
    delete this.mozPreferenceListener;
  },

  /**
   * Triggered when a new tab (with a different URI) is selected.
   * Change the statusbar icon according to the current formfill status.
   */
  onSelectNewURL: function(aURI) {
    if (this.submitting) {
      dump("onSelectNewURL, restoring global pref back to " + this.currentSaveFormhistory + "...\n");
      // restore original preference
      this.prefHandler.setGlobalRememberFormEntriesActive(this.currentSaveFormhistory);
      this.submitting = false;
      this.currentSaveFormhistory = null;
    }

    if (aURI.spec == this.oldURL)
      return;
    this.oldURL = aURI.spec;
    this.setStatusIcon();
  },

  /**
   * Triggered when any of the formfill preferences changes.
   * Change the statusbar icon according to the current formfill status.
   */
  onPrefsChange: function(prefName) {
    // ignore prefchanges while submitting
    if (!this.submitting) {
      this.setStatusIcon();
    }
  },

  /**
   * Triggered when a form is submitted.
   * When formhistory is managed by Form History Control, change the global
   * "remember formhistory" preference in order to save or not-save the
   * submitted form data according to Form History Control's preferences.
   */
  onFormSubmit: function() {
    dump("\n=== onFormSubmit ===\n");
    if (this.prefHandler.isManageHistoryByFHCEnabled() && !FhcUtil.inPrivateBrowsingMode()) {
      dump("- ManageByFHC is enabled.\n");
      var URI = gBrowser.selectedBrowser.currentURI;

      dump("- Checking if 'remember formhistory' should be enabled...\n");
      dump("- URL current tab = [" + URI.spec + "]\n");

      var doSaveFormhistory = this.prefHandler.isGlobalRememberFormEntriesActive();
      dump("- Current setting Mozilla formfill.enable=" + doSaveFormhistory + "\n");

      // remember current setting, restore after submit is done
      this.submitting = true;
      this.currentSaveFormhistory = doSaveFormhistory;

      this.prefHandler.setGlobalRememberFormEntriesActive(false);
      doSaveFormhistory = this.prefHandler.isGlobalRememberFormEntriesActive();
      dump("- New setting Mozilla formfill.enable=" + doSaveFormhistory + "\n");
      //TODO Add extra failsafe (setTimeout) to restore setting?

      dump("\n");
    }
  },

  /**
   * Change icon to reflect formfill status.
   */
  setStatusIcon: function() {
    dump("=== setStatusIcon ===\n");
    var URI = gBrowser.selectedBrowser.currentURI;
    var sbMenu = document.getElementById("formhistctrl-statusbarmenu");
    var tbMenu = document.getElementById("formhistctrl-toolbarbutton");

    dump("- URL current tab = [" + URI.spec + "]\n");
    if (!this.prefHandler.isGlobalRememberFormEntriesActive() || FhcUtil.inPrivateBrowsingMode()) {
      dump("- Remember formhistory is globally disabled.\n");
      sbMenu.setAttribute("savestate", "neversave");
      tbMenu.setAttribute("savestate", "neversave");
    }
    else if (this.prefHandler.isManageHistoryByFHCEnabled()) {
      dump("- ManageByFHC is enabled.\n");
      //TODO check if formfill for URI is enabled or disabled
      if (URI.spec.indexOf("com") > -1) {
        sbMenu.setAttribute("savestate", "nosave");
        tbMenu.setAttribute("savestate", "nosave");
      } else {
        sbMenu.setAttribute("savestate", "dosave");
        tbMenu.setAttribute("savestate", "dosave");
      }
    }
    else {
      dump("- Remember formhistory globally enabled.\n");
      // default icon
      sbMenu.removeAttribute("savestate");
      tbMenu.removeAttribute("savestate");
    }
  },

  // Register a preference listener to act upon relevant extension changes
  registerExtPrefListener: function() {
    var preferenceListener = new FhcUtil.PrefListener("extensions.formhistory.",
      function(branch, name) {
        switch (name) {
          case "manageFormhistoryByFHC":
               // adjust local var to reflect new preference value
               FhcManageFormHistoryOverlay.onPrefsChange(name);
               break;
        }
      });
    preferenceListener.register();
    return preferenceListener;
  },
  
  // Register a preference listener to act upon relevant mozilla changes
  registerMozPrefListener: function() {
    var preferenceListener = new FhcUtil.PrefListener("browser.formfill.",
      function(branch, name) {
        switch (name) {
          case "enable":
               // adjust local var to reflect new preference value
               FhcManageFormHistoryOverlay.onPrefsChange(name);
               break;
        }
      });
    preferenceListener.register();
    return preferenceListener;
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