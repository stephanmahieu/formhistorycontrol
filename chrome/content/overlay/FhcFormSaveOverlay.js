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
  timer:      null,
  timer2:     null,
  eventQueue: [],
  dbHandler:  null,

  init: function() {
    this.dbHandler = new FhcDbHandler();
    
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
    var timerEvent2 = {
      observe: function(subject, topic, data) {
        FhcFormSaveOverlay.doMaintenance();
      }
    }
    this.timer2 = Components.classes["@mozilla.org/timer;1"]
                   .createInstance(Components.interfaces.nsITimer);
    this.timer2.init(timerEvent2, 10*60*1000, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
  },

  destroy: function() {
    this.eventQueue = [];
    if (this.timer != null) this.timer.cancel();
    if (this.timer2 != null) this.timer2.cancel();
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
    var formid = null;
    var id = (node.id) ? node.id : ((node.name) ? node.name : "");
    switch(type) {
      case "textarea":
        uri = node.ownerDocument.documentURI;
        formid = this._getFormId(node);
        break;
      case "html":
        uri = node.documentURI;
        break;
      case "iframe":
        uri = node.ownerDocument.documentURI;
        break;
    }
//    dump("Type: " + type + "\n");
//    dump("Id  : " + id +   "\n");
//    dump("Uri : " + uri +  "\n");
//    dump(">>> content\n" + content + "\n<<< content\n");

    // add tot queue (if not already queued)
    this._queueEvent(type, id, formid, uri, node);
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

  _queueEvent: function(type, id, formid, uri, node) {
    var event = {
        type:   type,
        id:     id,
        formid: formid,
        uri:    uri,
        node:   node
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
    var content = this._getContent(event);
    //TODO asynchronous save to db
    dump("- Saving for uri: " + event.uri + "\n");
    dump("  type: " + event.type + ", id[" + event.id + "], formId[" + event.formid + "]\n");
    dump(">>> content\n" + content + "\n<<< content\n");
  },

  _getFormId: function(element) {
    var insideForm = false;
    var parentElm = element;
    while(parentElm && !insideForm) {
      parentElm = parentElm.parentNode;
      insideForm = ("FORM" == parentElm.tagName);
    }
    return (insideForm && parentElm) ? this._getId(parentElm) : null;
  },
  
  _getId: function(element) {
    if (element.id && element.id.length > 0) {
        return element.id;
    } else if (element.name && element.name.length > 0) {
       return element.name;
    }
    return null;
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
    //TODO cleanup old history
    //dump("doMaintenance event...\n")
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
