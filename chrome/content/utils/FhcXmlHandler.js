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
 * The Original Code is FhcXmlHandler.
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
 * FhcXmlHandler
 *
 * Methods for parsing and serializing XML Form History Data
 *
 * Dependencies: FhcDateHandler.js, FhcRdfExtensionHandler.js
 */
function FhcXmlHandler(fhcDatehandler) {
  this.serializer = Components.classes["@mozilla.org/xmlextras/xmlserializer;1"]
                              .createInstance(Components.interfaces.nsIDOMSerializer);
  this.dateHandler = fhcDatehandler;
}

FhcXmlHandler.prototype = {

  /**
   * Serialize formhistory entries into a XML string representation.
   *
   * @param  entries {Array}
   *         an array of formhistory entries
   *
   * @return {String}
   *         a pretty printed XML string representation of the entries
   */
  entriesToXMLString: function(entries) {
    // create a DOM tree
    var doc = document.implementation.createDocument("", "", null);
    var rootElem = doc.createElement("formhistory");
    doc.appendChild(rootElem);

    // create a header    
    this._appendHeaderElement(doc, rootElem);
    
    // create the fields
    var fieldsElem = doc.createElement("fields");
    rootElem.appendChild(fieldsElem);
    var fieldElem;
    for(var ii=0; ii<entries.length; ii++) {
      fieldElem = doc.createElement("field");
      this._appendElement    (doc, fieldElem, "name",      entries[ii].name);
      // cdata for value would be nice but is removed by XML.toXMLString()
      this._appendElement    (doc, fieldElem, "value",     this._encode(entries[ii].value));
      this._appendElement    (doc, fieldElem, "timesUsed", entries[ii].used);
      this._appendDateElement(doc, fieldElem, "firstUsed", entries[ii].first);
      this._appendDateElement(doc, fieldElem, "lastUsed",  entries[ii].last);
      fieldsElem.appendChild(fieldElem);
    }
    
    // serialize to string (pretty printed)
    XML.ignoreComments = false;
    return XML(this.serializer.serializeToString(doc)).toXMLString();
    //return this.serializer.serializeToString(doc);
  },

  /**
   * Deserialize a XML inputstream containing formhistory data into an array of
   * formhistory entries.
   *
   * @param  streamIn {nsIInputStream}
   *         the inputstream (source ) of the XML
   *
   * @return {Array}
   *         an array of formhistory entries
   */
  parseFormhistory: function(streamIn) {
    var parsedEntries = [];
    var now = this.dateHandler.getCurrentDate();

    var parser = new DOMParser();
    try {
      var doc = parser.parseFromStream(streamIn, "UTF-8", streamIn.available(), "text/xml");
      if ("formhistory" == doc.documentElement.nodeName) {
        var fldElem = doc.getElementsByTagName("field");
        var nameElem, valElem;
        for(var ii=0; ii<fldElem.length; ii++) {
          if (fldElem[ii].hasChildNodes()) {
            nameElem = fldElem[ii].getElementsByTagName("name");
            valElem = fldElem[ii].getElementsByTagName("value");

            if (1 == valElem.length && 0 < valElem[0].textContent.length) {
              parsedEntries.push({
                id:    -1,
                name:  nameElem[0].textContent,
                value: this._decode(valElem[0].textContent),
                used:  this._getElementValue(fldElem[ii], "timesUsed", 0),
                first: this._getElemenDate(  fldElem[ii], "firstUsed", now),
                last:  this._getElemenDate(  fldElem[ii], "lastUsed",  now)
              });
            }
          }
        }
      }
    } catch(ex) {
      alert("XML parser exception: " + ex);
    }
    return parsedEntries;
  },

  /**
   * Serialize the cleanup data/configuration into an XML string representation.
   *
   * @param  dbHandler {FhcDbHandler}
   *         the database handler
   *
   * @param  prefHandler {FhcPreferenceHandler}
   *         the preferenceHandler providing cleanup preferences.
   *
   * @return {String}
   *         a pretty printed XML string representation of the cleanup
   *         configuration
   */
  cleanupToXMLString: function(dbHandler, prefHandler) {
    // create a DOM tree
    var doc = document.implementation.createDocument("", "", null);
    var rootElem = doc.createElement("formhistory-cleanup");
    doc.appendChild(rootElem);

    // create a header
    this._appendHeaderElement(doc, rootElem);

    // criteria
    var criteriaElem = doc.createElement("cleanupCriteria");
    rootElem.appendChild(criteriaElem);

    // general time/usage criteria from preferences
    var generalElem = doc.createElement("general");
    criteriaElem.appendChild(generalElem);
    var child;
    child = this._appendElement(doc, generalElem, "daysUsedLimit", prefHandler.getCleanupDays());
    child.setAttribute("active", prefHandler.isCleanupDaysChecked());
    child = this._appendElement(doc, generalElem, "timesUsedLimit", prefHandler.getCleanupTimes());
    child.setAttribute("active", prefHandler.isCleanupTimesChecked());

    // general automatic cleanup from preferences
    child = this._appendElement(doc, generalElem, "cleanupOnShutdown", prefHandler.isCleanupOnShutdown());
    child = this._appendElement(doc, generalElem, "cleanupOnTabClose", prefHandler.isCleanupOnTabClose());

    // name/value pairs
    var namevalPairsElem = doc.createElement("nameValuePairs");
    criteriaElem.appendChild(namevalPairsElem);

    // name/value criteria
    var criteria = dbHandler.getAllCleanupCriteria();
    var namevalElem;
    for(var ii=0; ii<criteria.length; ii++) {
      namevalElem = this._createCleanupNameValueElement(doc, criteria[ii]);
      namevalPairsElem.appendChild(namevalElem);
    }
    criteria = null;

    // protect criteria
    var protectCriteriaElem = doc.createElement("protectCriteria");
    rootElem.appendChild(protectCriteriaElem);

    // name/value pairs
    var namevalPairsProtElem = doc.createElement("nameValuePairs");
    protectCriteriaElem.appendChild(namevalPairsProtElem);

    // name/value protect criteria
    var protectCriteria = dbHandler.getAllProtectCriteria();
    for(var jj=0; jj<protectCriteria.length; jj++) {
      namevalElem = this._createCleanupNameValueElement(doc, protectCriteria[jj]);
      namevalPairsProtElem.appendChild(namevalElem);
    }
    protectCriteria = null;

    // regexps
    var regexpsElem = doc.createElement("regularExpressions");
    rootElem.appendChild(regexpsElem);

    // regexp
    var regexpElem;
    var regexpData = dbHandler.getAllRegexp();
    for(var kk=0; kk<regexpData.length; kk++) {
      regexpElem = this._createRegexpElement(doc, regexpData[kk]);
      regexpsElem.appendChild(regexpElem);
    }
    regexpData = null;

    // keyBindings
    if (prefHandler.isExportConfigKeyBindings()) {
      var keyBindingsElem = doc.createElement("keyBindings");
      rootElem.appendChild(keyBindingsElem);
      var Ids = [
        "shortcutManager",
        "shortcutManageThis",
        "shortcutDeleteValueThis",
        "shortcutDeleteThis",
        "shortcutFillMostRecent",
        "shortcutFillMostUsed",
        "shortcutShowFormFields",
        "shortcutClearFields",
        "shortcutCleanupNow"];
      var keyBinding, bindingValueComplex, bindingValue;
      for (var i=0; i<Ids.length; i++) {
        bindingValueComplex = prefHandler.getKeybindingValue(Ids[i]);
        bindingValue = bindingValueComplex ? bindingValueComplex.data : "";
        keyBinding = this._createKeyBindingElement(doc, Ids[i], bindingValue);
        keyBindingsElem.appendChild(keyBinding);
      }
    }

    // serialize to string (pretty printed)
    XML.ignoreComments = false;
    return XML(this.serializer.serializeToString(doc)).toXMLString();
    //return this.serializer.serializeToString(doc);
  },

  /**
   * Deserialize a XML inputstream containing clesanup data into an array of
   * cleanup criteria.
   * 
   * @param  streamIn {nsIInputStream}
   * 
   * @param  prefHandler {FhcPreferenceHandler}
   *         the preferenceHandler providing cleanup preferences.
   * 
   * @return {Object}
   *         an Object containing arrays with the cleanup configuration.
   */
  parseCleanupConfig: function(streamIn, prefHandler) {
    var parsedCleanupCriteria = [];
    var parsedProtectCriteria = [];
    var parsedRegexp = [];

    var parser = new DOMParser();
    try {
      var doc = parser.parseFromStream(streamIn, "UTF-8", streamIn.available(), "text/xml");
      if ("formhistory-cleanup" == doc.documentElement.nodeName) {

        // general preferences
        var daysUsed = doc.getElementsByTagName("daysUsedLimit");
        if (daysUsed.length > 0 ) {
          var daysUsedActive = daysUsed[0].getAttribute("active");
          prefHandler.setCleanupDays(daysUsed[0].textContent);
          prefHandler.setCleanupDaysChecked(("true" == daysUsedActive));
        }
        var timesUsed = doc.getElementsByTagName("timesUsedLimit");
        if (timesUsed.length > 0 ) {
          var timesUsedActive = timesUsed[0].getAttribute("active");
          prefHandler.setCleanupTimes(timesUsed[0].textContent);
          prefHandler.setCleanupTimesChecked(("true" == timesUsedActive));
        }

        // added to config starting with v1.2.7
        var cleanupOnShutdown = doc.getElementsByTagName("cleanupOnShutdown");
        if (cleanupOnShutdown.length > 0) prefHandler.setCleanupOnShutdown("true" == cleanupOnShutdown[0].textContent);
        var cleanupOnTabClose = doc.getElementsByTagName("cleanupOnTabClose");
        if (cleanupOnTabClose.length > 0) prefHandler.setCleanupOnTabClose("true" == cleanupOnTabClose[0].textContent);

        // criteria nameValuePairs
        var namevalElem = doc.getElementsByTagName("nameValue");
        var criteria, nameElem, valElem, descrElem, critType;
        for(var ii=0; ii<namevalElem.length; ii++) {
          if (namevalElem[ii].hasChildNodes()) {
            descrElem = namevalElem[ii].getElementsByTagName("description");
            nameElem = namevalElem[ii].getElementsByTagName("name");
            valElem = namevalElem[ii].getElementsByTagName("value");

            if (1 == nameElem.length || 1 == valElem.length) {

              critType = "C";
              if ("protectCriteria" == namevalElem[ii].parentNode.parentNode.tagName) {
                critType = "P";
              }
              criteria = {
                id:          -1,
                name:        (1==nameElem.length)  ? this._decode(nameElem[0].textContent) : "",
                value:       (1==valElem.length)   ? this._decode(valElem[0].textContent)   : "",
                description: (1==descrElem.length) ? this._decode(descrElem[0].textContent) : "",
                nameExact:   (1==nameElem.length)  ? this._getIntAttr(nameElem[0],"exact")  : 0,
                nameCase:    (1==nameElem.length)  ? this._getIntAttr(nameElem[0],"case")   : 0,
                nameRegex:   (1==nameElem.length)  ? this._getIntAttr(nameElem[0],"regex")  : 0,
                valueExact:  (1==valElem.length)   ? this._getIntAttr(valElem[0], "exact")  : 0,
                valueCase:   (1==valElem.length)   ? this._getIntAttr(valElem[0], "case")   : 0,
                valueRegex:  (1==valElem.length)   ? this._getIntAttr(valElem[0], "regex")  : 0,
                critType:    critType
              };

              if ("C" == criteria.critType) {
                parsedCleanupCriteria.push(criteria);
              } else {
                parsedProtectCriteria.push(criteria);
              }
            }
          }
        }

        // regular expressions
        var regexpElem = doc.getElementsByTagName("regularExpression");
        var catElem, exprElem, useforElem, typeElem;
        for(var jj=0; jj<regexpElem.length; jj++) {
          if (regexpElem[jj].hasChildNodes()) {
            descrElem  = regexpElem[jj].getElementsByTagName("description");
            catElem    = regexpElem[jj].getElementsByTagName("category");
            exprElem   = regexpElem[jj].getElementsByTagName("expression");
            useforElem = regexpElem[jj].getElementsByTagName("useFor");
            typeElem   = regexpElem[jj].getElementsByTagName("type");

            parsedRegexp.push({
              id:          -1,
              description: this._decode(descrElem[0].textContent),
              category:    this._decode(catElem[0].textContent),
              regexp:      this._decode(exprElem[0].textContent),
              useFor:      useforElem[0].textContent,
              caseSens:    this._getIntAttr(exprElem[0],"exact"),
              regexpType:  ("built-in" == typeElem[0].textContent ? "b" : "")
            });
          }
        }

        // keyBindings
        if (prefHandler.isExportConfigKeyBindings()) {
          var keyBindingsElem = doc.getElementsByTagName("keyBinding");
          var bindingId, bindingValue;
          for(var kk=0; kk<keyBindingsElem.length; kk++) {
             bindingValue = this._decode(keyBindingsElem[kk].textContent);
             bindingId = keyBindingsElem[kk].getAttribute("id");
             prefHandler.setKeybindingValue(bindingId, bindingValue);
          }
        }
      }
    } catch(ex) {
      alert("XML parser exception: " + ex);
    }
    return {
      cleanup: parsedCleanupCriteria,
      protect: parsedProtectCriteria,
      regexp: parsedRegexp
    };
  },

  /**
   * Get the integer attribute from the element,
   * return 0 if the element has no such attribute.
   * 
   * @param element {DOM Element}
   *        the DOM element
   * @param attributeName {String}
   *        the name of the attribute
   */
  _getIntAttr: function(element, attributeName) {
    if (element.hasAttribute(attributeName)) {
      return parseInt(element.getAttribute(attributeName));
    }
    return 0;
  },

  /**
   * Encode special characters for use inside an XML document.
   *
   * @param  aString {String}
   *         string which may contain characters which are not allowed inside
   *         a XML document.
   *
   * @return {String}
   *         a string in which all invalid (international) characters are
   *         encoded so they can be safely used inside XML
   */
  _encode: function(aString) {
    // use encodeURIComponent() which can handle all international chars but
    // keep it somewhat readable by converting back some safe (for XML) chars
    return encodeURIComponent(aString)
             .replace(/\%20/g, " ")
             .replace(/^ /g, "%20") /* keep leading space  */
             .replace(/ $/g, "%20") /* keep trailing space */
             .replace(/\%21/g, "!")
             .replace(/\%22/g, '"')
             .replace(/\%23/g, "#")
             .replace(/\%24/g, "$")
             /* do not replace %25 (%) */
             .replace(/\%26/g, "&")
             .replace(/\%2B/g, "+")
             .replace(/\%2C/g, ",")
             .replace(/\%2F/g, "/")
             .replace(/\%3A/g, ":")
             .replace(/\%3B/g, ";")
             .replace(/\%3D/g, "=")
             .replace(/\%3F/g, "?")
             .replace(/\%40/g, "@")
             .replace(/\%5B/g, "[")
             .replace(/\%5C/g, "\\")
             .replace(/\%5D/g, "]")
             .replace(/\%5E/g, "^")
             .replace(/\%60/g, "`")
             .replace(/\%7B/g, "{")
             .replace(/\%7C/g, "|")
             .replace(/\%7D/g, "}")
             .replace(/\%7E/g, "~");
  },
  
  /**
   * Decode characters into their normal representation.
   *
   * @param  aString {String}
   *         string which may contain encoded characters
   *
   * @return {String}
   *         a string in which all encoded characters are decoded into its
   *         normal presentation
   */
  _decode: function(aString) {
    return decodeURIComponent(aString);
  },
  
  /**
   *  Create a DOM element for a date in native format (microseconds) and append
   *  it to the parentElemen. Also add a comment inside the date tag containing
   *  the date in human readable form.
   *
   *  @param  doc {DOM Document}
   *          the document object
   *  
   *  @param  parentElem {DOM Element}
   *          the DOM element in which to add the data child element
   *
   *  @param  aName {String}
   *          the tagname of the date element
   *
   *  @param  uSeconds {Object}
   *          the date in microseconds, the content of this element
   *
   *  @return {DOM Element}
   *          the newly create date element
   */
  _appendDateElement: function(doc, parentElem, aName, uSeconds) {
    var dateElem = null;
    if (uSeconds != undefined) {
      dateElem = doc.createElement(aName);
  
      var uSecondsElem = doc.createElement("date");
      uSecondsElem.textContent = uSeconds;
  
      var commentElem = doc.createComment(this.dateHandler.toFullDateString(uSeconds));
  
      dateElem.appendChild(commentElem);
      dateElem.appendChild(uSecondsElem);
      
      parentElem.appendChild(dateElem);
    }
    return dateElem;
  },
  
  /**
   *  Create a DOM element holding a string value and append it to the
   *  parentElem.
   *
   *  @param  doc {DOM Document}
   *          the document object
   *
   *  @param  parentElem {DOM Element}
   *          the DOM element in which to add the data child element
   *
   *  @param  aName {String}
   *          the tagname of the date element
   *
   *  @param  aValue {String}
   *          the value
   *
   *  @return {DOM Element}
   *          the newly created element
   */
  _appendElement: function(doc, parentElem, aName, aValue) {
    var childElem = null;
    if (aValue != undefined) {
      childElem = doc.createElement(aName);
      childElem.textContent = aValue;
      parentElem.appendChild(childElem);
    }
    return childElem;
  },
  
  /**
   *  Create a Header element inside the given parent containing application and
   *  version info elements.
   *
   *  @param doc {DOM Document}
   *         the document object
   *
   *  @param parentElem {DOM Element}
   *         the DOM element in which to add the new child elements
   */
  _appendHeaderElement: function(doc, parentElem) {
    var extHandler = new FhcRdfExtensionHandler();

    var headerElem = doc.createElement("header");
    parentElem.appendChild(headerElem);
    
    var appinfoElem = doc.createElement("application");
    appinfoElem.textContent = extHandler.getName();
    var versionElem = doc.createElement("version");
    versionElem.textContent = extHandler.getVersion();
    var dateElem = doc.createElement("exportDate");
    dateElem.textContent = this.dateHandler.getCurrentDateString();
    
    headerElem.appendChild(appinfoElem);
    headerElem.appendChild(versionElem);
    headerElem.appendChild(dateElem);
  },
  
  /**
   * Get the textcontent of a DOM Element from a parent by tagname. If no tag
   * is found, the default value is returned.
   * 
   * @param  parentElem {DOM Element}
   *         the DOM element containing the child element(s)
   *
   * @param  tagName {String}
   *         the name of the tag to search for inside the parent
   * 
   * @param  defaultValue {String}
   *         the value to return if no tag is found
   * 
   * @return {String}
   *         the textcontent of the requested child element or the default
   *         value if tag is not found
   */
  _getElementValue: function(parentElem, tagName, defaultValue) {
    var result = defaultValue;
    var childElem = parentElem.getElementsByTagName(tagName);
    if (1 == childElem.length && "" != childElem[0].textContent) {
      result = childElem[0].textContent;
    }
    return result;
  },
  
  /**
   * Get the date content of a DOM Element from a parent by tagname. If no tag
   * is found, the default value is returned.
   *
   * @param  parentElem {DOM Element}
   *         the DOM element containing the child element(s)
   *
   * @param  tagName {String}
   *         the name of the tag to search for inside the parent
   *
   * @param  defaultValue {String}
   *         the value to return if no tag is found
   *
   * @return {String}
   *         the date value of the requested child element or the default
   *         value if tag is not found
   */
  _getElemenDate: function(parentElem, tagName, defaultValue) {
    var result = defaultValue;
    var childElem = parentElem.getElementsByTagName(tagName);
    if (1 == childElem.length && childElem[0].hasChildNodes()) {
      result = this._getElementValue(childElem[0], "date");
    }
    return result;
  },

  /**
   * Create a NameValue element for a CleanUp criteria.
   * 
   * @param doc {DOM-document}
   *        the document containing DOM-elements
   *
   * @param cleanupCriteria {Object}
   *        the cleanupCriteria object
   *
   * @return {DOM element}
   *         the name-value element
   */
  _createCleanupNameValueElement: function(doc, cleanupCriteria) {
    var namevalElem, child, description;
    namevalElem = doc.createElement("nameValue");
    description = cleanupCriteria.description;
    this._appendElement(doc, namevalElem, "description", ((description)?this._encode(description):""));
    if (cleanupCriteria.name) {
      child = this._appendElement(doc, namevalElem, "name", this._encode(cleanupCriteria.name));
      child.setAttribute("case",  cleanupCriteria.nameCase);
      child.setAttribute("exact", cleanupCriteria.nameExact);
      child.setAttribute("regex", cleanupCriteria.nameRegex);
    }
    if (cleanupCriteria.value) {
      child = this._appendElement(doc, namevalElem, "value", this._encode(cleanupCriteria.value));
      child.setAttribute("case",  cleanupCriteria.valueCase);
      child.setAttribute("exact", cleanupCriteria.valueExact);
      child.setAttribute("regex", cleanupCriteria.valueRegex);
    }
    return namevalElem;
  },

  /**
   * Create a regexp element for a regular expression.
   *
   * @param doc {DOM-document}
   *        the document containing DOM-elements
   *
   * @param regExp {Object}
   *        the regExp object
   *
   * @return {DOM element}
   *         the regExp element
   */
  _createRegexpElement: function(doc, regExp) {
    var regExpElem, child;
    regExpElem = doc.createElement("regularExpression");
    this._appendElement(doc, regExpElem, "description",        this._encode(regExp.description));
    this._appendElement(doc, regExpElem, "category",           this._encode(regExp.category));
    child = this._appendElement(doc, regExpElem, "expression", this._encode(regExp.regexp));
    child.setAttribute("case",                                 regExp.caseSens);
    this._appendElement(doc, regExpElem, "useFor",             regExp.useFor);
    this._appendElement(doc, regExpElem, "type", ("b" == regExp.regexpType ? "built-in" : "user-defined"));
    return regExpElem;
  },

  _createKeyBindingElement: function(doc, id, binding) {
    var bindingElem = doc.createElement("keyBinding");
    bindingElem.textContent = this._encode(binding);
    bindingElem.setAttribute("id", id);
    return bindingElem;
  }
}