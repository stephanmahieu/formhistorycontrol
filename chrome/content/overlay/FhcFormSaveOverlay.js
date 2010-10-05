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
 * Dependencies: 
 */

const FhcFormSaveOverlay = {

  init: function() {
    removeEventListener("load", FhcFormSaveOverlay.init, false);

    addEventListener("submit", FhcFormSaveOverlay.submit, false);
    addEventListener("reset", FhcFormSaveOverlay.reset, false);
    addEventListener("keyup", FhcFormSaveOverlay.keyup, false);
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
    var n = t.nodeName;
    if ("textarea" == n.toLowerCase()) {
      FhcFormSaveOverlay._contentChanged(t.ownerDocument.documentURI, "textarea", t.value);
    }
    else if ("html" == n.toLowerCase()) {
      //dump("keyup from html\n");
      var p = t.parentNode;
      if (p && "on" == p.designMode) {
        FhcFormSaveOverlay._contentChanged(p.documentURI, "html", p.body.innerHTML);
      }
    }
    else if ("body" == n.toLowerCase()) {
      // body of iframe
      //dump("keyup from body\n");
      var elem = t.ownerDocument.activeElement;
      if ("true" == elem.contentEditable) {
        FhcFormSaveOverlay._contentChanged(elem.ownerDocument.documentURI, "iframe", elem.innerHTML);
      }
    }
  },

  _contentChanged: function(uri, type, content) {
    dump("Type: " + type + "\n");
    dump("Uri : " + uri + "\n");
    dump(">>> content\n" + content + "\n<<< content\n");
  }
};

addEventListener("load", FhcFormSaveOverlay.init, false);