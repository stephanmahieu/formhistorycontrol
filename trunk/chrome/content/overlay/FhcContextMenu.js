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
 * The Original Code is FhcContextMenu.
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
 * Handler for the contentAreaContextMenu an the statusbar menu.
 * The contentAreaContextMenu menu popups when right-clicking from within a
 * browser window (html page).
 * The handlers attaches its own handleEvent method, so each time the
 * contentAreaContextMenu or statusbar popups, the contextmenuPopup() method is
 * called.
 * The contextmenuPopup method enables/disables the relevant menu-items and also
 * contains methods for deleting the history directly without invoking the GUI.
 *
 * Dependencies:
 *   FhcMenuOverlay.xul, FhcUtil.js, FhcDbHandler.js,
 *   FhcBundle.js, FhcDateHandler.js, FhcCleanupFilter.js
 *   
 */
const FhcContextMenu = {
  dbHandler: null,
  bundle: null,
  preferences: null,
  dateHandler: null,
  cleanupFilter: null,
  keyBindings: null,
  
  /**
   * Implementation of the EventListener Interface for listening to
   * contentAreaContextMenu and taskbarmenu events.
   *
   * @param {Event} aEvent
   */
  handleEvent: function(aEvent) {
    switch(aEvent.type) {
      case "load":
        // add an eventlistener for the contextmenu-Popup
        // can't use onpopupshowing in the xul (need to chain ours, not replace existing!)
        var menu = document.getElementById("contentAreaContextMenu");
        if (menu) menu.addEventListener("popupshowing", this, false);
        if (menu) menu.addEventListener("popuphiding", this, false);

        // add an eventlistener for the statusbar-menu-Popup
        menu = document.getElementById("formhistctrl-statusbarmenu-popup");
        if (menu) menu.addEventListener("popupshowing", this, false);
        if (menu) menu.addEventListener("popuphiding", this, false);

        // add an eventlistener for the toolbar-menu-Popup
        menu = document.getElementById("formhistctrl-toolbarmenu-popup");
        if (menu) menu.addEventListener("popupshowing", this, false);
        if (menu) menu.addEventListener("popuphiding", this, false);

        // add an eventhandler to capture right-click on statusbar icon
        var stBar = document.getElementById("formhistctrl-statusbarmenu");
        if (stBar) stBar.addEventListener("click", this, false);

        this.dbHandler     = new FhcDbHandler();
        this.bundle        = new FhcBundle();
        this.preferences   = new FhcPreferenceHandler();
        this.dateHandler   = new FhcDateHandler(this.bundle);
        this.cleanupFilter = new FhcCleanupFilter(
                                    this.preferences,
                                    this.dbHandler,
                                    this.dateHandler);
        this.keyBindings   = new FhcKeyBindings(this.preferences);

        // listen to preference updates
        this._registerPrefListener();

        // make sure the visibility of the fhc menu's is correct
        this._setVisibilityStatusbarMenu(this.preferences.isTaskbarVisible());
        this._setVisibilityToolsMenu(!this.preferences.isToolsmenuHidden());
        this._setVisibilityContextMenu(!this.preferences.isContextmenuHidden());

        // initialize main keybindings
        this._initializeMainKeyset();
        break;
  
      case "popupshowing":
        this.contextmenuPopup(aEvent);
        break;

      case "popuphiding":
        this.contextmenuHide(aEvent);
        break;

      case "click":
        if (aEvent.button == 2) {
          // Right click
          var menuPopup = document.getElementById("statusbarFhcRightClickMenu");
          var statusBarPanel = document.getElementById("formhistctrl-statusbarmenu");
          menuPopup.openPopup(statusBarPanel, "before_start", 0, 0, false, false);
        }
        break;
    }
  },

  /**
   * Method called each time the contentAreaContextMenu or statusbar-menu popups.
   * Enable/disable the delete/manage menuItems when invoked from an
   * input-text-element.
   * If a menuitem contains a command, the menuitem can only be disabled by
   * disabling the command!
   *
   * @param {Event} aEvent
   */
  contextmenuPopup: function(aEvent) {
    var hasFields;

    switch(aEvent.target.id) {

      case "contentAreaContextMenu":
        var inputField = document.commandDispatcher.focusedElement;
        var isInputText = (inputField != null && "INPUT" == inputField.nodeName && "text" == inputField.type);
        var isValueInFormHistory = isInputText && this._isValueInFormHistory(inputField);
        hasFields = this._containsInputFields();
        this._disable("cmd_DeleteValueThisField", !isValueInFormHistory);
        this._disable("cmd_DeleteEntriesThisField", !isInputText);
        this._disable("cmd_ManageThisField", !isInputText);
        this._disable("cmd_FillFormFieldsRecent", !hasFields);
        this._disable("cmd_FillFormFieldsUsed", !hasFields);
        this._disable("cmd_ClearFilledFormFields", !hasFields);
        break;

      case "formhistctrl-statusbarmenu-popup":
        hasFields = this._containsInputFields();
        this._disable("cmd_FillFormFieldsRecent", !hasFields);
        this._disable("cmd_FillFormFieldsUsed", !hasFields);
        this._disable("cmd_ClearFilledFormFields", !hasFields);
        break;

      case "formhistctrl-toolbarmenu-popup":
        hasFields = this._containsInputFields();
        this._disable("cmd_FillFormFieldsRecent", !hasFields);
        this._disable("cmd_FillFormFieldsUsed", !hasFields);
        this._disable("cmd_ClearFilledFormFields", !hasFields);
        break;
    }
    return true;
  },

  /**
   * Re-enable commands that were disabled in order to "grey out" menu-items.
   * Method is called each time one of the menu's hides.
   * The commands are also used in global keybindings, so we have to re-enable
   * the commands in order for keybindings to function all the time.
   */
  contextmenuHide: function() {
    this._disable("cmd_DeleteValueThisField", false);
    this._disable("cmd_DeleteValueThisField", false);
    this._disable("cmd_ManageThisField", false);
    this._disable("cmd_FillFormFieldsRecent", false);
    this._disable("cmd_FillFormFieldsUsed", false);
    this._disable("cmd_ClearFilledFormFields", false);
  },

  /**
   * Delete the value found in the current focused text-input-field from the
   * FormHistory database.
   */
  menuDeleteValueThisField: function() {
    var inputField = document.commandDispatcher.focusedElement;
    var isInputText = (inputField != null && "INPUT" == inputField.nodeName && "text" == inputField.type);
    var isValueInFormHistory = isInputText && this._isValueInFormHistory(inputField);
    if (!isValueInFormHistory) {
      return;
    }
    var fieldname = this._getFieldName(inputField);
    
    if (inputField && ("" != inputField.value)) {
      var doDelete = true;    
      if (this.preferences.isWarnOnDeleteOne()) {
        var result = FhcUtil.confirmDialog(
          this.bundle.getString("popupmenu.prompt.deletehistorythisfieldandvalue.title"),
          this.bundle.getString("popupmenu.prompt.deletehistorythisfieldandvalue", [inputField.value, fieldname]),
          this.bundle.getString("prompt.check.delete.singleentry.askagain"));
        if (result.isOkay && result.isChecked) {
          this.preferences.setWarnOnDeleteOne(false);
        }
        doDelete = result.isOkay;
      }
    
      if (doDelete) {
        if (this.dbHandler.deleteEntryByNameAndValue(fieldname, inputField.value)) {
          // clear value from inputelement and reset focus
          inputField.value = "";
          window.focus();
          inputField.focus();
        } else {
          // Deleting entry failed! (should never occur)
        }
      }
    }
  },

  /**
   * Delete all values for the current focused text-input-field from the
   * FormHistory database.
   */
  menuDeleteEntriesThisField: function() {
    var inputField = document.commandDispatcher.focusedElement;
    var isInputText = (inputField != null && "INPUT" == inputField.nodeName && "text" == inputField.type);
    if (!isInputText) {
      return;
    }
    var fieldname = this._getFieldName(inputField);

    var doDelete = true;    
    if (this.preferences.isWarnOnDeleteMultiple()) {
      var result = FhcUtil.confirmDialog(
        this.bundle.getString("popupmenu.prompt.deletehistorythisfield.title"),
        this.bundle.getString("popupmenu.prompt.deletehistorythisfield", [fieldname]),
        this.bundle.getString("prompt.check.delete.singleentry.askagain"));
      if (result.isOkay && result.isChecked) {
        this.preferences.setWarnOnDeleteMultiple(false);
      }
      doDelete = result.isOkay;
    }
    
    if (doDelete) {
      if (this.dbHandler.deleteEntriesByName(fieldname)) {
        // clear value from inputelement and reset focus
        inputField.value = "";
        window.focus();
        inputField.focus();
      } else {
        // Deleting entries failed! (should never occur)
      }
    }
  },

  /**
   * Fill all empty fields with the most recent entries.
   */
  menuFillFormFieldsRecent: function() {
    var mainDocument = window.getBrowser().contentDocument;
    this._fillEmptyInputFields(mainDocument, "recent");
  },

  /**
   * Fill all empty fields with the most often used entries.
   */
  menuFillFormFieldsUsed: function() {
    var mainDocument = window.getBrowser().contentDocument;
    this._fillEmptyInputFields(mainDocument, "often");
  },

  /**
   * Restore all fields filled by me.
   */
  menuClearFilledFormFields: function() {
    var mainDocument = window.getBrowser().contentDocument;
    this._clearFilledInputFields(mainDocument);
  },

  /**
   * Display an infolabel next to each formfield on the page.
   */
  menuShowFormFields: function() {
    var mainDocument = window.getBrowser().contentDocument;
    this._displayFormFields(mainDocument);
  },

  /**
   * Cleanup the formhistory database.
   */
  cleanupFormhistoryNow: function() {
    var delEntries = [];
    var allEntries = this.dbHandler.getAllEntries();
    if (allEntries && allEntries.length > 0) {
      delEntries = this.cleanupFilter.getMatchingEntries(allEntries);
      if (delEntries && delEntries.length > 0) {
        if (this.dbHandler.deleteEntries(delEntries)) {
          this._notifyStoreChanged();
        }
      }
    }
    
    var statusText = "Form History ";
    if (delEntries && 0 < delEntries.length) {
      statusText += this.bundle.getString("prefwindow.cleanup.status.deleted", [delEntries.length])
    } else {
      statusText += this.bundle.getString("prefwindow.cleanup.status.nothingdeleted");
    }

    var notBox = gBrowser.getNotificationBox();
    var n = notBox.getNotificationWithValue('popup-blocked');
    if(n) {
        // already showing, put in my message
        n.label = statusText;
    } else {
        notBox.appendNotification(statusText, 'popup-blocked',
                             'chrome://browser/skin/Info.png',
                              notBox.PRIORITY_INFO_MEDIUM, []);
    }
  },

  /**
   * Save the current field to the formhistory database.
   */
  saveThisField: function() {
    var inputField = document.commandDispatcher.focusedElement;
    if (FhcUtil.isInputTextElement(inputField)) {
      if (!this._isValueInFormHistory(inputField)) {
        var now = this.dateHandler.getCurrentDate();
        var newEntry = {
              name:  this._getFieldName(inputField),
              value: inputField.value,
              used:  1,
              first: now,
              last:  now
            };
        this.dbHandler.addEntry(newEntry, null);

        // Notify HistoryWindow of DB-changes
        Components.classes["@mozilla.org/observer-service;1"]
                  .getService(Components.interfaces.nsIObserverService)
                  .notifyObservers(null, "cleanup-db-changed", "");
                  
        // TODO: localize message
        this._showMessage('fhcSaveMessageField', "Field saved");
      }
    }
  },

  /**
   * Save all fields on the current page to the formhistory database.
   */
  saveThisPage: function() {
    // TODO: save all fields on page to db...
    // 
    // TODO: localize message
    this._showMessage('fhcSaveMessageFields', "All fields on the page are saved");
  },

  /**
   * Show a message for 1 second, then let it fade-out.
   *
   * @param id {String}
   *        the id of the div elemet to create and add to the page
   *
   * @param infoMessage {String}
   *        the (short) message to display
   */
  _showMessage: function(id, infoMessage) {
    var document = window.getBrowser().contentDocument;
    var top = 250; // centering vertically unreliable, use constant

    // when to use css property -moz-border-radius or border-radius (2.0)
    var str = navigator.userAgent;
    var geckoVer = str.match(/rv:[\d\.]+/g)[0].replace('rv:', '').match(/\d/g);
    var radius = ('2' == geckoVer[0]) ? 'border-radius' : '-moz-border-radius';

    // outer div
    var style = 'position:fixed; z-index:1000; cursor:default; ' +
      'top:' + top + 'px; left:100px;' + //top = (document.body.clientHeight-height)/2
      'padding:20px; background-color:#000; opacity: 0.50; ' +
      '-moz-box-shadow: 6px 6px 6px rgba(0,0,0,0.7); ' + radius + ':15px';
    var div = document.createElement('div');
    div.setAttribute('id', id);
    div.setAttribute('style', style);
    div.setAttribute('onclick', "this.style.display='none';");

    // inner div holding message with a contrasting border
    var msgDiv = document.createElement('div');
    div.appendChild(msgDiv);
    style = 'overflow:hidden; ' +
      'padding:10px; border:3px solid #FFFFFF; ' + radius + ':10px;' +
      'text-align:center; font:bold 18px sans-serif; color:#FFF';
    msgDiv.setAttribute('style', style);
    msgDiv.appendChild(document.createTextNode(infoMessage));

    // add script to fade-out message automatically after 1 second
    var script = document.createElement('script');
    div.appendChild(script);
    script.setAttribute('language', 'JavaScript');
    var jScript = 
      "function fade" + id + "(op){" +
        "var el=document.getElementById('" + id + "');" +
        "if (el) el.style.opacity=op/100;" +
      "}" +
      "for(var i=1;i<=10;i++){setTimeout(fade" + id + ",1000+30*i,50-i*5);}";
    script.appendChild(document.createTextNode(jScript));

    // remove old message (if it exists) and display the new message
    this._removeMessage(document, id);
    document.body.appendChild(div, document.body.firstElementChild);

    // use the actual width to center the outer div horizontally
    div.style.left = (document.body.clientWidth-div.offsetWidth)/2 + 'px';

    // remove message after 2 secs (failsafe when javascript is disabled in browser)
    window.setTimeout(this._removeMessage, 2000, document, id);
  },

  /**
   * Remove an element from the body of a document.
   *
   * @param document {DOM document}
   *        the document from which the element is removed
   *
   * @param id {String}
   *        the id of the DOM element to remove from the page
   */
  _removeMessage: function(document, id) {
    var element = document.getElementById(id);
    if (element) {
      document.body.removeChild(element);
    }
  },

  /**
   * Disable/enable an element using the "disabled" attribute. Using the
   * disabled property does not seem to work for commands.
   *
   * @param id {String}
   *        the id of the DOM element
   *        
   * @param flag (boolean}
   *        whether to enable (false) or disable (true) the element
   */
  _disable: function(id, flag) {
    var obj = document.getElementById(id);
    if (flag) {
      obj.setAttribute("disabled", 'true');
    } else {
      obj.removeAttribute("disabled");
    }
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
   * Determine the fieldName of an input field (either id or name).
   *
   * @param  inputField {DOM element}
   *         the input textfield
   *
   * @return {String}
   *         the id of the textfield, if no id then return the name
   */
  _getFieldName: function(inputField) {
    return (inputField.name && inputField.name.length > 0)
           ? inputField.name
           : inputField.id;
  },
  
  /**
   * Determine if the inputField has a value that occurs in the FormHistory
   * database.
   *
   * @param  inputField {DOM element}
   *         the input textfield
   *
   * @return {Boolean}
   *         whether or not the inputField occurs in the FormHistory database
   */
  _isValueInFormHistory: function(inputField) {
    var hasValue = ("" != inputField.value);
    return hasValue && this.dbHandler.entryExists(this._getFieldName(inputField), inputField.value);
  },

  /**
   * Determine if inputFields are present in the current HTML document.
   *
   * @return {Boolean}
   *         whether or not the current HTML document contains input fields
   */
  _containsInputFields: function() {
    var mainDocument = window.getBrowser().contentDocument;
    var inputFields = FhcUtil.getInputTextNames(mainDocument);
    return (inputFields.length > 0);
  },


  /**
   * Fill empty input fields with data from the formhistory.
   *
   * @param document {DOM Document}
   *        the HTML document containing zero or more inputfields
   *        
   * @param type {String ["recent", "latest"]}
   *        the type of values for filling fileds
   */
  _fillEmptyInputFields: function(document, type) {
    var tags = document.getElementsByTagName("input");

    for (var ii=0; ii < tags.length; ii++) {

      if (FhcUtil.isInputTextElement(tags[ii])) {
        var elemHtmlInput = tags[ii];
        var fldName = this._getFieldName(elemHtmlInput);

        // Exclude disabled, hidden/not visible
        if (!elemHtmlInput.disabled && !FhcUtil.elementIsHidden(elemHtmlInput)) {

          if (elemHtmlInput.value == "" || elemHtmlInput.hasAttribute("fhcCustomProperty")) {
            var value;
            switch (type) {
              case "recent":
                   value = this.dbHandler.getMostRecentEntry(fldName);
                   break;
              case "often":
                   value = this.dbHandler.getMostUsedEntry(fldName);
                   break;
            }
            if (value != "") {
              // Set the new value
              elemHtmlInput.value = value;

              // keep track of changes made by FHC
              elemHtmlInput.setAttribute("fhcCustomProperty", "FHC");

              // change style to indicate the field is filled by FHC
              this._setFhcStyle(elemHtmlInput);
            }
          }
        }
      }
    }
    // child documents?
    for (var jj=0; jj < document.defaultView.frames.length; jj++) {
      // recurse childdocument
      this._fillEmptyInputFields(document.defaultView.frames[jj].document, type);
    }
  },

  /**
   * Clear the fields filled by FHC.
   *
   * @param document {DOM Document}
   *        the HTML document containing zero or more inputfields
   */
  _clearFilledInputFields: function(document) {
    var tags = document.getElementsByTagName("input");
    
    for (var ii=0; ii < tags.length; ii++) {
      if (FhcUtil.isInputTextElement(tags[ii])) {
        var elemHtmlInput = tags[ii];
        if (elemHtmlInput.hasAttribute("fhcCustomProperty")) {
          // remove custom attribute
          elemHtmlInput.removeAttribute("fhcCustomProperty");
          // clear the value and restore the original style
          elemHtmlInput.value = "";
          this._resetFhcStyle(elemHtmlInput);
        }
      }
    }
    // child documents?
    for (var jj=0; jj < document.defaultView.frames.length; jj++) {
      // recurse childdocument
      this._clearFilledInputFields(document.defaultView.frames[jj].document);
    }
  },

  /**
   * Set a special style on an element to indicate value has been changed.
   *
   * @param elem {DOM element}
   *        the text inputfield
   */
  _setFhcStyle: function(elem) {
    // change style to indicate the field is filled by FHC
    if (this.preferences.isQuickFillChangeBgColor()) {
      this._setNewStyle(elem, "backgroundColor", this.preferences.getQuickFillChangeBgColor());
    }
    if (this.preferences.isQuickFillChangeBrdrColor()) {
      this._setNewStyle(elem, "borderColor", this.preferences.getQuickFillChangeBrdrColor());
    }
    if (this.preferences.isQuickFillChangeBrdrThickness()) {
      //this._setNewStyle(elem, "borderStyle", "solid");
      this._setNewStyle(elem, "borderWidth", this.preferences.getQuickFillChangeBrdrThickness() + "px");
    }
  },

  /**
   * Reset the style of the given element to its original state.
   * 
   * @param elem {DOM element}
   *        the text inputfield
   */
  _resetFhcStyle: function(elem) {
    // restore the original style (if not void)
    this._restoreStyle(elem, "backgroundColor");
    this._restoreStyle(elem, "borderWidth");
    this._restoreStyle(elem, "borderStyle");
    this._restoreStyle(elem, "borderColor");
  },

  /**
   * Set a new value for the given style of element elem.
   * Store the original style in a custom attribute so it can
   * be restored later.
   *
   * @param elem {DOM element}
   *        the element for which the style must be restored
   *
   * @param style {String}
   *        the particular style to restore
   */
  _restoreStyle: function(elem, style) {
    var orgAttribute = "fhc_orgstyle_" + style;
    if (elem.hasAttribute(orgAttribute)) {
      elem.style[style] = elem.getAttribute(orgAttribute);
      elem.removeAttribute(orgAttribute);
    }
  },

  /**
   * Set a new value for the given style of an element.
   * Store the original stylevalue in a custom attribute.
   *
   * @param elem {DOM element}
   *        the element for which the style is changed
   *
   * @param style {String}
   *        the new style to apply
   *
   * @param value {String}
   *        the new stylevalue
   */
  _setNewStyle: function(elem, style, value) {
    var orgAttribute = "fhc_orgstyle_" + style;
    if (!elem.hasAttribute(orgAttribute)) {
      // store current value
      elem.setAttribute(orgAttribute, elem.style[style]);
      // apply new style
      elem.style[style] = value;
    }
  },
  
  /**
   * Create (toggle) a tooltip-like element right next to each formfield.
   * The new element displays the name of the formfield. If the new element
   * already exists, it will be deleted.
   *
   * @param document {DOM Document}
   *        the HTML document containing zero or more formfields.
   */
  _displayFormFields: function(document) {
    var tags = document.getElementsByTagName("input");
    var elemHtmlInput, div, id;

    for (var ii=0; ii < tags.length; ii++) {

      if (FhcUtil.isInputTextElement(tags[ii])) {
        elemHtmlInput = tags[ii];

        // Exclude hidden/not visible
        if (FhcUtil.elementIsVisible(elemHtmlInput)) {
          id = 'fhcFldInfo' + ii;
          if (document.getElementById(id)) {
            // Remove info element
            document.body.removeChild(document.getElementById(id));
          } else {
            // Insert info element
            div = this._createInfoElement(document, id, elemHtmlInput);
            document.body.insertBefore(div, document.body.firstElementChild);
          }
        }
      }
    }
    // child documents?
    for (var jj=0; jj < document.defaultView.frames.length; jj++) {
      // recurse childdocument
      this._displayFormFields(document.defaultView.frames[jj].document);
    }
  },

  /**
   * Create a div element for displaying the fieldname next to a formfield.
   *
   * @param document {DOM Document}
   *        the HTML document containing the inputfield
   *
   * @param id {String}
   *        the unique id for the div element
   *
   * @param sourceElem {DOM Element}
   *        the inputfield determining the position for the new div element
   *
   * @return {DOM Element}
   *         the newly created div, absolute positioned next to the sourceElem
   */
  _createInfoElement: function(document, id, sourceElem) {
    var fldName = this._getFieldName(sourceElem);
    if (fldName == '') {
      fldName = '\u00a0'; //&nbsp;
    }

    var style = 'display:block; border:1px solid #000; ' +
      'background-color:#FFFFAA; color:#000; opacity: 0.75; ' +
      'font: bold 11px sans-serif; padding: 0 4px; ' +
      'text-decoration:none; z-index: 1000; cursor:default; ' +
      'box-shadow: 3px 3px 2px black; -moz-box-shadow: 3px 3px 2px black; ';

    var compstyle = document.defaultView.getComputedStyle(sourceElem, null);
    var width = parseInt(compstyle.getPropertyValue("width").replace('px', ''));
    var padding = parseInt(compstyle.getPropertyValue("padding-right").replace('px', ''));
    var border = parseInt(compstyle.getPropertyValue("border-right-width").replace('px', ''));

    var left = 0, top = 0, elem = sourceElem;
    if (elem.offsetParent) {
      do {
        left += elem.offsetLeft;
        top += elem.offsetTop;
      } while ((elem = elem.offsetParent));
    }
    style += 'position:absolute; top:' + top + 'px; ';
    style += 'left:' + (left + width + padding + border + 4) + 'px; ';

    var div = document.createElement('div');
    div.setAttribute('id', id);
    div.setAttribute('title', this._getFormInfo(sourceElem));
    div.setAttribute('style', style);
    div.appendChild(document.createTextNode(fldName));

    return div;
  },

  /**
   * Collect the attributes for the element and its form container and
   * return as String.
   *
   * @param element {DOM Element}
   *        the inputfield
   *
   * @return {String}
   *         info about element and form
   */
  _getFormInfo: function(element) {
    var result = 'FIELD: ', form = element;
    for (var j = 0; j < element.attributes.length; j++) {
      result += element.attributes[j].name + '=' + element.attributes[j].value + ' ';
    }

    while (form.parentNode && form.localName != 'form') {
      form = form.parentNode;
    } 
    if (form && form.localName == 'form') {
      result += ' ->  FORM: ';
      for (var i = 0; i < form.attributes.length; i++) {
        result += form.attributes[i].name + '=' + form.attributes[i].value + ' ';
      }
    }
    return result;
  },

  /**
   * Register a preference listener to act upon relevant preference changes.
   */
  _registerPrefListener: function() {
    this.preferenceListener = new FhcUtil.PrefListener("extensions.formhistory.",
      function(branch, name) {

        if (name.substring(0,11) == "keybinding.") {
          FhcContextMenu.keyBindings.updateMainKeyset(name.substring(11), true);
          return;
        }

        var doShow;
        switch (name) {
          case "showStatusBarIcon":
               doShow = FhcContextMenu.preferences.isTaskbarVisible();
               FhcContextMenu._setVisibilityStatusbarMenu(doShow);
               break;
          case "hideToolsMenuItem":
               doShow = !FhcContextMenu.preferences.isToolsmenuHidden();
               FhcContextMenu._setVisibilityToolsMenu(doShow);
               break;
          case "hideContextMenuItem":
               doShow = !FhcContextMenu.preferences.isContextmenuHidden();
               FhcContextMenu._setVisibilityContextMenu(doShow);
               break;
        }
      });
    this.preferenceListener.register();
  },

  /**
   * Set or clear the hidden attribute of the statusbar menu.
   * 
   * @param doShow (Boolean)
   *        show or hide the menu
   */
  _setVisibilityStatusbarMenu: function(doShow) {
    var menuElem = document.getElementById("formhistctrl-statusbarmenu");
    if (!doShow) {
      menuElem.setAttribute("hidden", true);
    } else {
      menuElem.removeAttribute("hidden");
    }
  },

  /**
   * Set or clear the hidden attribute of the FormHistoryControl tools menu.
   *
   * @param doShow (Boolean)
   *        show or hide the menu
   */
  _setVisibilityToolsMenu: function(doShow) {
    var menuElem = document.getElementById("formhistctrl_tools_menu");
    if (!doShow) {
      menuElem.setAttribute("hidden", true);
    } else {
      menuElem.removeAttribute("hidden");
    }
  },

  /**
   * Set or clear the hidden attribute of the FormHistoryControl context menu.
   *
   * @param doShow (Boolean)
   *        show or hide the menu
   */
  _setVisibilityContextMenu: function(doShow) {
    var menuSep  = document.getElementById("formhistory-sep");
    var menuElem = document.getElementById("formhistctrl_context_menu");
    if (!doShow) {
      menuSep.setAttribute("hidden", true);
      menuElem.setAttribute("hidden", true);
    } else {
      menuSep.removeAttribute("hidden");
      menuElem.removeAttribute("hidden");
    }
  },

  /**
   * Initialize the keybindings for the mainKeyset.
   */
  _initializeMainKeyset: function() {
    var Ids = [
      "shortcutManager",
      "shortcutManageThis",
      "shortcutDeleteValueThis",
      "shortcutDeleteThis",
      "shortcutFillMostRecent",
      "shortcutFillMostUsed",
      "shortcutShowFormFields",
      "shortcutClearFields",
      "shortcutCleanupNow",
      "shortcutSaveThisField",
      "shortcutSaveThisPage"];
    for (var i=0; i<Ids.length; i++) {
      this.keyBindings.updateMainKeyset(Ids[i], false);
    }
  }
}

// Implement the handleEvent() method for this handler to work
window.addEventListener("load", FhcContextMenu, false);