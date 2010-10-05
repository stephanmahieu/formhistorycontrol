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
 * The Original Code is FhcBrowseHistoryDialog.
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
 * Methods for the form history edit dialog.
 * Only used within FhcEntryDialog.xul, thus no danger of namespace conflicts.
 *
 * Dependencies: FhcBrowseHistoryDialog.xul, FhcDbHandler.js,
 *               FhcBundle.js, FhcDateHandler.js, FhcUtil.js
 *
 */
const FhcBrowseHistoryDialog = {
  LOOKUP_COUNT:  10,
  dbHandler:     null,
  bundle:        null,
  dateHandler:   null,
  lastHistDate:  null,
  firstHistDate: null,

  /**
   * Initialize dialog.
   */
  init: function() {
    //var what = window.arguments[0].what;
    var fieldName = window.arguments[0].fieldName;
    var dateUsed  = window.arguments[0].date;

    this.bundle = new FhcBundle();
    this.dbHandler = new FhcDbHandler();
    this.bundle = new FhcBundle();
    this.dateHandler = new FhcDateHandler(this.bundle);

    var report = document.getElementById("browsereport");
    var reportTxt = this._getFieldInfo(fieldName, dateUsed);
    report.value = reportTxt;

    this.lastHistDate = dateUsed;
    this.firstHistDate = dateUsed;

    this.getOlder();
    report.inputField.scrollTop = 0;
  },

  /**
   * Dialog closes, cleanup.
   */
  destroy: function() {
    delete this.dateHandler;
    delete this.bundle;
    delete this.dbHandler;
    return true;
  },

  /**
   * Get additional older history.
   */
  getOlder: function() {
    var report = document.getElementById("browsereport");
    var reportTxt = report.value;

    // get pages visited before the field was submitted
    var places = this.dbHandler.getVisitedPlaces(this.lastHistDate, this.LOOKUP_COUNT);
    if (places.length == 0) {
      if (reportTxt[reportTxt.length - 1] != "<") {
        reportTxt += "\n" + this.bundle.getString("browsehistorywindow.report.nomorehistory") + " <";
      }
    }
    else {
      for (var ii=0; ii<places.length; ii++) {
        reportTxt += "\n" + this._getPlaceInfo(places[ii]);
      }
      this.lastHistDate = places[places.length-1].date;
    }

    report.value = reportTxt;

    // Scroll to the end
    report.inputField.scrollTop = report.inputField.scrollHeight - report.inputField.clientHeight;
  },

  /**
   * Get additional newer history.
   */
  getNewer: function() {
    var report = document.getElementById("browsereport");
    var reportTxt = report.value;

    // get pages visited after the field was submitted
    var places = this.dbHandler.getVisitedPlacesAfter(this.firstHistDate, this.LOOKUP_COUNT);
    if (places.length == 0) {
      if (reportTxt[0] != ">") {
        reportTxt = "> " +
          this.bundle.getString("browsehistorywindow.report.nomorehistory") +
          "\n\n" + reportTxt;
      }
    }
    else {
      for (var ii=0; ii<places.length; ii++) {
        reportTxt = this._getPlaceInfo(places[ii]) + "\n" + reportTxt;
      }
      this.firstHistDate = places[places.length-1].date;
    }

    report.value = reportTxt;
  },

  /**
   * Get the field info as a String.
   *
   * @param fieldName {String}
   * @param dateUsed {Integer}
   *
   * @return {String} placeinfo
   */
  _getFieldInfo: function(fieldName , dateUsed) {
    var reportTxt = "";
    reportTxt += "=============\n";
    reportTxt += this.dateHandler.toDateString(dateUsed) + "\n" +
                 "  " + this.bundle.getString("browsehistorywindow.report.fieldname") + ": " +
                 fieldName + "\n";
    reportTxt += "=============\n";
    return reportTxt;
  },

  /**
   * Get the place info as a String.
   *
   * @param place {Object}
   * 
   * @return {String} placeinfo
   */
  _getPlaceInfo: function(place) {
    var placeInfo = "";
    placeInfo += this.dateHandler.toDateString(place.date) + "\n";
    placeInfo += "   host: \t" + place.host + "\n";
    placeInfo += "   title:\t" + place.title + "\n";
    placeInfo += "   url:  \t" + place.url + "\n";
    //placeInfo += "  count:\t" + place.count + "\n\n";
    return placeInfo;
  }
}