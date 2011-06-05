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
 * The Original Code is FhcFormSaveOverlay.
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
 * Methods for saving data in textarea's.
 * 
 * Dependencies: FhcDbHandler.js
 */

const FhcFormSaveOverlay = {
  timer:            null,
  maintenanceTimer: null,
  eventQueue:       [],
  dbHandler:        null,
  observerService:  null,
  prefListener:     null,

  init: function() {
    this.dbHandler = new FhcDbHandler();
    
    this.observerService = Components.classes["@mozilla.org/observer-service;1"]
                          .getService(Components.interfaces.nsIObserverService);

    addEventListener("submit", function(e){FhcFormSaveOverlay.submit(e)}, false);
    addEventListener("reset", function(e){FhcFormSaveOverlay.reset(e)}, false);
    addEventListener("keyup", function(e){FhcFormSaveOverlay.keyup(e)}, false);

    // dispatch event every 5 seconds
    var timerEvent = {
      observe: function(subject, topic, data) {
        FhcFormSaveOverlay.dispatchEvent();
      }
    }
    this.timer = Components.classes["@mozilla.org/timer;1"]
                  .createInstance(Components.interfaces.nsITimer);
    this.timer.init(timerEvent, 5*1000, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
    
    // dispatch maintenance event every 10 minutes
    var maintenanceEvent = {
      observe: function(subject, topic, data) {
        FhcFormSaveOverlay.doMaintenance();
      }
    }
    this.maintenanceTimer = Components.classes["@mozilla.org/timer;1"]
                           .createInstance(Components.interfaces.nsITimer);
    this.maintenanceTimer.init(maintenanceEvent, 10*60*1000, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
    
    this._registerPrefListener();
  },

  destroy: function() {
    this._unregisterPrefListener();
    this.eventQueue = [];
    if (this.maintenanceTimer != null) this.maintenanceTimer.cancel();
    if (this.timer != null) this.timer.cancel();
    delete this.dbHandler;
  },

  submit: function(event) {
    //dump("FhcFormSaveOverlay::Form submit?\n");
  },

  reset: function(event) {
    //dump("FhcFormSaveOverlay::Form reset?\n");
  },

  keyup: function(event) {
    // only handle displayable chars
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;

    var t = event.originalTarget;
    var n = t.nodeName.toLowerCase();
    if ("textarea" == n) {
      //var id = (t.id) ? t.id : t.name;
      //dump("textarea with id: " + id + "\n");
      this._contentChanged("textarea", t);
    }
    else if ("html" == n) {
      //dump("keyup from html\n");
      var p = t.parentNode;
      if (p && "on" == p.designMode) {
        this._contentChanged("html", p);
      }
    }
    else if ("body" == n) {
      // body of iframe
      //dump("keyup from body\n");
      var e = t.ownerDocument.activeElement;
      if ("true" == e.contentEditable) {
        this._contentChanged("iframe", e);
      }
    }
  },

  _contentChanged: function(type, node) {
    var uri;
    var formid = "";
    var id = (node.id) ? node.id : ((node.name) ? node.name : "");
    var name = (node.name) ? node.name : ((node.id) ? node.id : "");
    switch(type) {
      case "textarea":
        uri = node.ownerDocument.documentURIObject;
        formid = this._getFormId(node);
        break;
      case "html":
        uri = node.documentURIObject;
        break;
      case "iframe":
        uri = node.ownerDocument.documentURIObject;
        break;
    }

    // add tot queue (if not already queued)
    this._queueEvent(name, type, id, formid, uri, node);
  },

  _alreadyQueued: function(event) {
    var e;
    for (var it=0; it<this.eventQueue.length; it++) {
      e = this.eventQueue[it];
      if (e.node == event.node) {
        return true;
      }
    }
    return false;
  },

  /**
   * Place an event on the queue.
   * 
   * @param name {String}
   *        the name of the field if present otherwise the id
   *        
   * @param type {String}
   *        the type of the field (textarea|html|iframe)
   *        
   * @param id {String}
   *        the id of the field if present otherwise the name
   *        
   * @param formid {String}
   *        the id of the parent form of the field
   *        
   * @param uri {nsIURI}
   *        the uri of the page
   *        
   * @param node {Node}
   *        the node object representing the field
   */
  _queueEvent: function(name, type, id, formid, uri, node) {
    var event = {
        node:       node,
        type:       type,
        id:         id,
        name:       name,
        formid:     formid,
        url:        uri.spec,
        host:       this._getHost(uri),
      //firstsaved: null,
        lastsaved:  null,
        content:    null
      };
    if (!this._alreadyQueued(event)) {
      this.eventQueue.push(event);
    }
  },

  _getContent: function(event) {
    var content = "";
    switch(event.type) {
      case "textarea":
        content = event.node.value;
        break;
      case "html":
        content = event.node.body.innerHTML;
        break;
      case "iframe":
        content = event.node.innerHTML;
        break;
    }
    return content;
  },

  _saveContent: function(event) {
    var d = new Date();
    var now = d.getTime() * 1000;
    
    //event.firstsaved = ;
    event.lastsaved = now;
    event.content = this._getContent(event);
    
    this.dbHandler.saveOrUpdateMultilineItem(event);
    //dump("- Saving for uri: " + event.url + "\n");
    //dump("  type: " + event.type + ", id[" + event.id + "], formId[" + event.formid + "]\n");
    //dump(">>> content\n" + event.content + "\n<<< content\n");

    // notify observers
    this.observerService.notifyObservers(null, "multiline-store-changed", "");
  },

  _getFormId: function(element) {
    var insideForm = false;
    var parentElm = element;
    while(parentElm && !insideForm) {
      parentElm = parentElm.parentNode;
      insideForm = ("FORM" == parentElm.tagName);
    }
    return (insideForm && parentElm) ? this._getId(parentElm) : "";
  },
  
  _getId: function(element) {
    return (element.id) ? element.id : ((element.name) ? element.name : "");
  },
  
  /**
   * Return the host of a URL (http://host:port/path).
   * 
   * @param  aURI {nsIURI}
   * @return {String} the host of strURL
   */
  _getHost: function(aURI) {
    if (aURI.schemeIs("file")) {
      return "localhost";
    } else {
      return aURI.host;
    }
  },

  dispatchEvent: function() {
    if (0 < this.eventQueue.length) {
      //dump("TimerEvent and queue not empty!\n");
      for (var it=0; it<this.eventQueue.length; it++) {
        this._saveContent(this.eventQueue[it]);
      }
      this.eventQueue = [];
      //dump("Finished processing queue\n");
    }
  },
  
  doMaintenance: function() {
    //TODO multiline cleanup old history
    //dump("doMaintenance event...\n")
  },
  
  // Register a preference listener to act upon multiline pref changes
  _registerPrefListener: function() {
    var thisHwc = this;
    this.prefListener = new Prefs.PrefListener(
      function(branch, name) {
        switch (name) {
          case "backupenabled":
               break;
          case "saveolder":
               break;
          case "savelength":
               break;
          case "deleteolder":
               break;
          case "exception":
          case "exceptionlist":
               break;
          case "savealways":
               break;
          case "saveencrypted":
               break;
        }
      });
    this.prefListener.register();
  },
 
  // Unregister the preference listener
  _unregisterPrefListener: function() {
    if (this.prefListener) {
      this.prefListener.unregister();
      this.prefListener = null;
    }
  }
};

const Prefs = {
  /**
   * Method for registering an observer which gets called when any of the
   * formhistory multiline preferences change.
   *
   * @param func {Function} the observer to call when preferences change
   */
  PrefListener: function(func) {
    var prefService = Components.classes["@mozilla.org/preferences-service;1"]
                        .getService(Components.interfaces.nsIPrefService);
    var branch = prefService.getBranch("extensions.formhistory.multiline.");
    branch.QueryInterface(Components.interfaces.nsIPrefBranch2);

    this.register = function() {
      branch.addObserver("", this, false);
    };

    this.unregister = function unregister() {
      if (branch)
        branch.removeObserver("", this);
    };

    this.observe = function(subject, topic, data) {
      if ("nsPref:changed" == topic)
        func(branch, data);
    };
  }  
};

addEventListener("load",
  function(e) {
    FhcFormSaveOverlay.init(e);
    removeEventListener("load", arguments.callee, false);
  },
  false
);

addEventListener("unload",
  function(e) {
    FhcFormSaveOverlay.destroy(e);
  },
  false
);
