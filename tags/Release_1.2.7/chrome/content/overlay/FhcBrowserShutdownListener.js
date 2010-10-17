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
 *   FhcPreferenceHandler.js
 */
const FhcBrowserListener = {
  prefHandler: null,
  dbHandler: null,
  dateHandler: null,
  cleanupFilter: null,
  bundle: null,

  init: function() {
    this.bundle        = new FhcBundle();
    this.prefHandler   = new FhcPreferenceHandler();
    this.dbHandler     = new FhcDbHandler();
    this.dateHandler   = new FhcDateHandler(
                                this.bundle);
    this.cleanupFilter = new FhcCleanupFilter(
                                this.prefHandler,
                                this.dbHandler,
                                this.dateHandler);
  },

  destroy: function() {
    delete this.cleanupFilter;
    delete this.dateHandler;
    delete this.dbHandler;
    delete this.prefHandler;
    delete this.bundle;
  },

  /**
   * Implementation of the EventListener Interface for listening to
   * events.
   *
   * @param {Event} aEvent
   */
  handleEvent: function(aEvent) {
    switch(aEvent.type) {
      case "load":
        gBrowser.tabContainer.addEventListener("TabClose", FhcBrowserListener, false);
        break;
  
      case "unload":
        this.init();
        if (this.prefHandler.isCleanupOnShutdown()) {
          this.cleanupFormHistory();
        }
        this.destroy();
        break;

      case "TabClose":
        //var browser = gBrowser.getBrowserForTab(event.target);
        this.init();
        if (this.prefHandler.isCleanupOnTabClose()) {
          this.cleanupFormHistory();
        }
        this.destroy();
        break;
    }
  },

  /**
   * Cleanup the formhistory database.
   */
  cleanupFormHistory: function() {
    var delEntries = [];

    var allEntries = this.dbHandler.getAllEntries();
    if (allEntries && allEntries.length > 0) {
      delEntries = this.cleanupFilter.getMatchingEntries(allEntries);
      if (delEntries && delEntries.length > 0) {
        this.dbHandler.deleteEntries(delEntries);    
      }
    }

    /*
    if (delEntries && 0 < delEntries.length) {
      dump("Form History Control::CleanUp on shutdown: Deleted " + delEntries.length + " entries.\n");
    } else {
      dump("Form History Control::CleanUp on shutdown: Nothing to delete.\n");
    }*/
    
    delEntries = null;
    allEntries = null;
  }
}

// call handleEvent method for the following events:
window.addEventListener("load", FhcBrowserListener, false);
window.addEventListener("unload", FhcBrowserListener, false);
// TabClose handler is added by the load handler,
// that way we know for sure gBrowser is initialized.