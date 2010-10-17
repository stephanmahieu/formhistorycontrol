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
 * The Original Code is FhcSearchbarOverlay.
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
 * Methods to extend the searchbar right-click dropdown-menu with an extra
 * menuitem to invoke the "manage-this-field" FormHistory dialog.
 * 
 * Dependencies: FhcShowDialog.js, FhcBundle.js.
 */

const FhcSearchbarOverlay = {

  init: function() {
    removeEventListener("load", FhcSearchbarOverlay.init, false);

    var os = Components.classes["@mozilla.org/xre/app-info;1"]
               .getService(Components.interfaces.nsIXULAppInfo)
               .QueryInterface(Components.interfaces.nsIXULRuntime)
               .OS;
    if (/linux/ig.test(os)) {
      addEventListener("mousedown", FhcSearchbarOverlay.click, false);
    } else if (/win/ig.test(os)) {
      addEventListener("click", FhcSearchbarOverlay.click, false);
    } else {
      addEventListener("click", FhcSearchbarOverlay.click, false);
    }
    addEventListener("popupshown", FhcSearchbarOverlay.popupshown, false);
  },

  click: function(event) {
    if(event.button == 0) {
      if ("fhc-context-menuitem" == event.originalTarget.getAttribute("anonid")) {
        FhcShowDialog.doShowFormHistoryControl({searchbarField:true});
      }
    }
  },

  popupshown: function(event) {
    var t = event.originalTarget;
    var n = t.nodeName;

    if (!/popup/.test(t.nodeName)) {
      return;
    }
    if ((n == "xul:menupopup") || (n == "popup") || (n == "xul:popup") || (n == "menupopup")) {
      if ((t.getAttribute("type")) && (t.getAttribute("type") != "menu")) {
        return;
      }

      // only continue when searchbar is the parent
      if (t.parentNode && t.parentNode.parentNode && t.parentNode.parentNode.parentNode && t.parentNode.parentNode.parentNode.parentNode) {
        var p4 = t.parentNode.parentNode.parentNode.parentNode;
        if (p4.id != "searchbar") {
          return;
        }
      } else {
        return;
      }

      if (!t.getAttribute("fhc_menu_added")) {
        var bundle = new FhcBundle();
        var menuLabel = bundle.getString("searchbarfield.menuitem.managethis.label");
        bundle = null;

        var s = t.ownerDocument.createElement("menuseparator");
        t.appendChild(s);
        var m = t.ownerDocument.createElement("menuitem");
        m.setAttribute("anonid", "fhc-context-menuitem");
        m.setAttribute("label", menuLabel);
        m.setAttribute("hidden", false);
        m.setAttribute("class", "menuitem-iconic fh_menuitem_managethisfield");
        m.setAttribute("tooltiptext", "Form History Control");
        t.appendChild(m);
        t.setAttribute("fhc_menu_added", true);

        // Do not remove listener: after customize toolbar (via right-click)
        // this menuitem is destroyed and needs to be added again.
        //removeEventListener("popupshown", FhcSearchbarOverlay.popupshown, false);
      }
    }
  }
};

addEventListener("load", FhcSearchbarOverlay.init, false);