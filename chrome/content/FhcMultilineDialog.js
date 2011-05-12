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
 * The Original Code is FhcMultilineDialog.
 *
 * The Initial Developer of the Original Code is Stephan Mahieu.
 * Portions created by the Initial Developer are Copyright (C) 2011
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
 * Methods for the form history multiline dialog.
 *
 * Dependencies: 
 */
const FhcMultilineDialog = {
  multilineItem: null,
  
  /**
   * Initialize dialog.
   */
  init: function() {
    if (window.arguments[0] && window.arguments[0].content) {
      this.multilineItem = window.arguments[0];
      var content = this.multilineItem.content;
      
      document.getElementById("textContent").value = content;
      
      if (content.match(/<\w+/)){
        // content contains html
        var dom = this._stringToDOM(content);
        document.getElementById("iframeContent").contentWindow.document.body.appendChild(dom);

      } else {
        // plain text only, hide all tabs and show the plain tabbox
        document.getElementById("tabs").hidden = true;
        document.getElementById("tabbox").selectedTab = document.getElementById("tab-text");
      }
    }
  },

  /**
   * Copy multiline text to the clipboard.
   *
   * @return {Boolean}
   *         true when copy succeeded
   */
  onCopyToClipboard: function() {
    Components.classes["@mozilla.org/widget/clipboardhelper;1"]
              .getService(Components.interfaces.nsIClipboardHelper)
              .copyString(this.multilineItem.content);
    return true;
  },
  
  /**
   * Safely parse a string containing HTML into a DOM.
   * This is an alternative to: document.body.innerHTML = content;
   *  
   * There are potential dangers involved in injecting remote content in a
   * privileged context.
   * 
   * The function below will safely parse simple HTML and return a DOM object.
   * This will remove tags like <script>, <style>, <head>, <body>, <title>, and <iframe>.
   * It also removes all JavaScript, including element attributes containing JavaScript.
   * 
   * @param aHTMLString {String}
   *        string containing HTML elements
   *        
   * @return {DOM}
   *         parsed HTML without potentially dangerous content
   * 
   */
  _stringToDOM: function(aHTMLString){
    var html = document.implementation.createDocument("http://www.w3.org/1999/xhtml", "html", null);
    var body = document.createElementNS("http://www.w3.org/1999/xhtml", "body");
    html.documentElement.appendChild(body);

    body.appendChild(Components.classes["@mozilla.org/feed-unescapehtml;1"]
      .getService(Components.interfaces.nsIScriptableUnescapeHTML)
      .parseFragment(aHTMLString, false, null, body));

    return body;
  }
}