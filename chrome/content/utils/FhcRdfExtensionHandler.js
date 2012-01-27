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
 * The Original Code is FhcRdfExtensionHandler.
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
 * Read values from the install.rdf of this extension.
 * Handy for incorporating info in the about dialog.
 *
 * Dependencies: -
 */
function FhcRdfExtensionHandler() {
  this.rdfs = Components.classes["@mozilla.org/rdf/rdf-service;1"]
                .getService(Components.interfaces.nsIRDFService);
  this.extension = this.rdfs.GetResource("urn:mozilla:item:formhistory@yahoo.com");
  
  if (Components.classes["@mozilla.org/extensions/manager;1"]) {
    this._useNewAddonManager = false;
    this.extDS = Components.classes["@mozilla.org/extensions/manager;1"]
                   .getService(Components.interfaces.nsIExtensionManager)
                   .datasource;
  }
  else {
    // Since FF3.7a6pre (4.0)
    this._useNewAddonManager = true;
    Components.utils.import("resource://gre/modules/AddonManager.jsm");
    AddonManager.getAddonByID("formhistory@yahoo.com", this._addonCallBack);
  }
}


// Class FhcRdfExtensionHandler
FhcRdfExtensionHandler.prototype = {

  /**
   * Return the name of this addon.
   * @return {String}
   */
  getName: function() {
    if (this._useNewAddonManager) {
      return this._getAddon().name;
    }
    return this._getValue("name");
  },

  /**
   * Return the name of this addon.
   * @return {String}
   */
  getDescription: function() {
    if (this._useNewAddonManager) {
      return this._getAddon().description;
    }
    return this._getValue("description");
  },

  /**
   * Return the version of this addon.
   * @return {String}
   */
  getVersion: function() {
    if (this._useNewAddonManager) {
      return this._getAddon().version;
    }
    return this._getValue("version");
  },

  /**
   * Return the homepageURL of this addon.
   * @return {String}
   */
  getHomepageURL: function() {
    if (this._useNewAddonManager) {
      return this._getAddon().homepageURL;
    }
    return this._getByTagname("em:homepageURL");
  },

  /**
   * Return the creator of this addon.
   * @return {String}
   */
  getCreator: function() {
    if (this._useNewAddonManager) {
      return this._getAddon().creator;
    }
    return this._getByTagname("em:creator");
  },

  /**
   * Get the contributors from the install.rdf. getValues will only read
   * locale dependend info, so the contributors must be present in all locale
   * sections of install.rdf as well :-(
   *
   * @param contributors {Array}
   *        empty array of contributors to be populated by this metod
   *
   * @param translators {Array}
   *        empty array of translators to be populated by this metod
   */
  getContributors: function(contributors, translators) {
    var xml = this._getXMLFile();

    var contrib = xml.getElementsByTagName("em:contributor");
    for(var ii=0; ii<contrib.length; ii++) {
      contributors.push(contrib[ii].textContent);
    }

    var transl  = xml.getElementsByTagName("em:translator");
    for(var jj=0; jj<transl.length; jj++) {
      translators.push(transl[jj].textContent);
    }
  },


  /**
   * Asynchronous callback method, invoked during construction of this class
   * when the new AddonManager is used; FF >= 3.7a6pre (4.0).
   *
   * @param addon {Addon}
   *        the current installed FormHistoryControl add-on
   */
  _addonCallBack: function(addon) {
    // store the addon object
    FhcRdfExtensionHandler.fhcAddon = addon;
  },

  /**
   * Return the Addon object representing the installed FormHistoryControl.
   * Only available for FF >= 3.7a6pre (4.0).
   *
   * @return {Addon}
   *         the current installed FormHistoryControl add-on
   */
  _getAddon: function() {
    if (FhcRdfExtensionHandler.fhcAddon == null) {
      var thread = Components.classes["@mozilla.org/thread-manager;1"]
                    .getService(Components.interfaces.nsIThreadManager)
                    .currentThread;
      var start = new Date();
      while (FhcRdfExtensionHandler.fhcAddon == null && ((new Date())-start) < 750) {
        thread.processNextEvent(true);
      }
    }
    return FhcRdfExtensionHandler.fhcAddon;
  },

  /**
   * Get a single resource value.
   *
   * @param   resourceName {String}
   *          the name of the resource of the rdf info
   *
   * @return {String}
   *          the resource value
   */
  _getValue: function(resourceName) {
    var targetArc = this.rdfs.GetResource(this._em_namespace(resourceName));
    var result = this.extDS.GetTarget(this.extension, targetArc, true);
    if (result)
      result = result.QueryInterface(Components.interfaces.nsIRDFLiteral).Value;
    return result;
  },

  /**
   * Prefix the rdf namespace to aProperty.
   *
   * @param   aProperty {String}
   *          the property
   *
   * @returns {String}
   *          aProperty prepended with the rdf namespace
   */
  _em_namespace: function(aProperty) {
    return "http://www.mozilla.org/2004/em-rdf#" + aProperty;
  },

  /**
   * Get a single value from the install.rdf directly from the xml.
   * If we would use getValue() we would only get locale dependend info,
   * thus the information should have to be present in all locale sections.
   *
   * @param tagname {String}
   *        the name of the tag of the install.rdf
   * 
   * @return {String}
   *         the textcontent of the tag
   */
  _getByTagname: function(tagname) {
    var xml = this._getXMLFile();
    var elem = xml.getElementsByTagName(tagname);
    return elem[0].textContent;
  },

  /**
   * Read the install.rdf file located in the chrome directory.
   *
   * @return {XML DOM}
   *         the XML DOM representation of the XML file
   */
  _getXMLFile: function() {
    var xmlfile;
    if (this._useNewAddonManager) {
      try {
        var installURI = this._getAddon().getResourceURI("install.rdf");
        return this._getXMLFromURI(installURI.spec);
      }
      catch(ex) {
        // Probably no getResourceURL method! (SeaMonkey)
        var dirServiceProp = Components.classes["@mozilla.org/file/directory_service;1"]
                             .getService(Components.interfaces.nsIProperties);
        xmlfile = dirServiceProp.get("ProfD", Components.interfaces.nsIFile);
        xmlfile.append("extensions");
        xmlfile.append("formhistory@yahoo.com");
        if (xmlfile.isDirectory()) {
          xmlfile.append("install.rdf");
        }
        else if (xmlfile.isFile()) {
          xmlfile = this._resolveDevelopmentLocation(xmlfile);
        }
      }
    }
    else {
      xmlfile = Components.classes["@mozilla.org/extensions/manager;1"]
                   .getService(Components.interfaces.nsIExtensionManager)
                   .getInstallLocation("formhistory@yahoo.com")
                   .getItemFile("formhistory@yahoo.com", "install.rdf");
    }

    return this._parseXMLFileToDOM(xmlfile);
  },

  /**
   * Parse an XML file into a DOM.
   *
   * @param  xmlfile {nsIFile}
   *         the xml file.
   *
   * @return {DOM}
   *         xmlfile parsed to DOM.
   */
  _parseXMLFileToDOM: function(xmlfile) {
    var xml = null;
    try {
      // open xml file for reading
      var streamIn = Components.classes["@mozilla.org/network/file-input-stream;1"]
                       .createInstance(Components.interfaces.nsIFileInputStream);
      streamIn.init(xmlfile, -1/*(PR_RDONLY)*/, -1/*default permission*/, null);

      // parse xml
      try {
        var parser = new DOMParser();
        xml = parser.parseFromStream(streamIn, "UTF-8", streamIn.available(), "text/xml");
      }
      catch(parseEx) {
        dump('Exception parsing xml:' + parseEx + '\n');
      }
    }
    catch(streamEx) {
      dump('Exception reading xml stream:' + streamEx + '\n');
    }
    return xml;
  },

  /**
   * Return the DOM of an XML file retrieved by its URI.
   *
   * @param  uri {nsiURI}
   *         The uri of an XML file to retrieve.
   *
   * @return {DOM}
   *         the xml file.
   */
  _getXMLFromURI: function(uri) {
    FhcRdfExtensionHandler.fhcInstallRdfXML = "";

    // Asynchronous request
    var req = new XMLHttpRequest();
    req.open("GET", uri, true); // retrieve file from local chrome directory
    req.onreadystatechange = function (aEvt) {
      if (req.readyState == 4) {
        if (req.status == 0) {
          FhcRdfExtensionHandler.fhcInstallRdfXML = req.responseXML;
        } else {
          FhcRdfExtensionHandler.fhcInstallRdfXML = "ERR";
          dump("_getXMLFromURI: Error loading uri!\n");
        }
      }
    };
    req.send(null);

    // If slow, wait for completion
    if (FhcRdfExtensionHandler.fhcInstallRdfXML == "") {
      var thread = Components.classes["@mozilla.org/thread-manager;1"]
                    .getService(Components.interfaces.nsIThreadManager)
                    .currentThread;
      while (FhcRdfExtensionHandler.fhcInstallRdfXML == "") {
        thread.processNextEvent(true);
      }
    }

    return FhcRdfExtensionHandler.fhcInstallRdfXML;
  },

  /**
   * Instead of the xpi or directory, a file can be used containing one line
   * of text describing the actual location of the extension (development use).
   * This method reads the first line of the file and returns the location as
   * a new nsILocalFile object.
   *
   * @param  shortcutFile {nsILocalFile}
   *         file containing a string describing the actual location.
   *
   * @return {nsILocalFile}
   *         The actual location.
   */
  _resolveDevelopmentLocation: function(shortcutFile) {
    // reading contents
    var devStreamIn = Components.classes["@mozilla.org/network/file-input-stream;1"]
                      .createInstance(Components.interfaces.nsIFileInputStream);
    devStreamIn.init(shortcutFile, -1/*(PR_RDONLY)*/, -1/*default permission*/, null);

    var developLocation = {};
    try {
      // assume real location is on first line
      devStreamIn.readLine(developLocation);
    } finally {
      devStreamIn.close();
    }

    var xmlfile = "";
    if (developLocation && developLocation.value) {
      // try linked location
      xmlfile = Components.classes["@mozilla.org/file/local;1"]
                      .createInstance(Components.interfaces.nsILocalFile);
      xmlfile.initWithPath(developLocation.value);
      xmlfile.append("install.rdf");
    }
    return xmlfile;
  }
}