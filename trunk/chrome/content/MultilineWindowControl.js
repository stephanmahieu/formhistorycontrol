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
 * The Original Code is MultilineWindowControl.
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
 * Multiline Methods for the dialog HistoryWindowControl.
 *
 * Dependencies:
 *   HistoryWindowControl.xul, HistoryWindowControl.js, FhcUtil.js,
 *   FhcDbHandler.js, FhcShowDialog.js.
 *
 */
const MultilineWindowControl = {
  // nsITreeView attributes
  treeBox: null,
  rowCount: 0,
  atomService: null,
  //
  countLabel: "",
  selectCountLabel: "",
  dbHandler: null,
  dateHandler: null,
  prefHandler: null,
  bundle: null,
  alldata: [],
  data: [],
  dbObserver: null,
 
  /**
   * Initialize.
   */
  init: function(aDbHandler, aDateHandler, aPrefHandler, aBundle) {
    // initialize tree
    var formTree = document.getElementById("multilineHistoryTree");
    formTree.view = this;

    // for treecell property (checkbox)
    this.atomService = Components.classes["@mozilla.org/atom-service;1"]
                        .getService(Components.interfaces.nsIAtomService);

    // initialize handlers
    this.dbHandler = aDbHandler;
    this.dateHandler = aDateHandler;
    this.prefHandler = aPrefHandler;
    this.bundle = aBundle;
    
    this.countLabel = document.getElementById("multilineItemCount");
    this.selectCountLabel = document.getElementById("multilineSelectCount");

    // read all multiline items from the db into the treeView
    this.repopulateView();

    // read preferences and apply to UI
    this.readAndShowPreferences();

    // set initial sort
    this.sortColumn();

    // observe changes to the database
    this.dbObserver = {
      observe: function(subject, topic, state) {
        MultilineWindowControl.repopulateView();
      },
      register: function() {
        Components.classes["@mozilla.org/observer-service;1"]
                  .getService(Components.interfaces.nsIObserverService)
                  .addObserver(this, "multiline-store-changed", false);
      },
      unregister: function() {
        Components.classes["@mozilla.org/observer-service;1"]
                  .getService(Components.interfaces.nsIObserverService)
                  .removeObserver(this, "multiline-store-changed");
      }
    };
    this.dbObserver.register();
  },

  /**
   * Extension close.
   */
  destroy: function() {
    this.dbObserver.unregister();
    delete this.dbObserver;
    return true;
  },

  /**
   * Right-click popup contextmenu activation from MultilineWindowControl Dialog.
   *
   * @param event {Event}
   */
  menuPopup: function(event) {
    var selected = this.getSelected();
    document.getElementById("mnDeleteMultiline").setAttribute("disabled", 0 == selected.length);
    return true;
  },

  /**
   * Menubar activated from MultilineWindowControl Dialog (onpopupshowing).
   *
   * @param {Event} event
   */
  menubarPopup: function(event) {
    var selectCount = this.getSelectCount();
    document.getElementById("mnbarMlDelete").setAttribute("disabled", 0 == selectCount);
    return true;
  },

  /**
   * Perform the action indicated by doAction.
   * Action is Delete or View. Update the countlabel accordingly.
   *
   * @param doAction {String}
   *        one of ["Delete"]
   */
  editAction: function(doAction) {
    var selected = this.getSelected();
    if (selected.length > 0) {
      switch(doAction) {
        case "Delete":
          this._removeMultiline(selected);
          this._updateCountLabel();
          break;
        case "View":
          FhcShowDialog.doShowFhcMultilineItem(selected[0]);
          break;
      }
    }
  },

  /**
   * Tree row is selected, enable/disable buttons and update selectcount label.
   *
   * @param event {Event}
   */
  treeSelect: function(event) {
    var selectCount = this.getSelectCount();

    // enable remove-button only when at leat 1 item is selected
    var btnRemove = document.getElementById("removeMultiline");
    btnRemove.setAttribute("disabled", 0 == selectCount);

    // enable view-button only when 1 item is selected
    var btnview = document.getElementById("viewMultiline");
    btnview.setAttribute("disabled", 1 != selectCount);

    // display selectCount
    this._updateSelectCountLabel(selectCount);
  },

  /**
   * Doubleclicked on a treeitem: start viewing item.
   *
   * @param event {Event}
   */
  treeDblclick: function(event) {
    var selected = this.getSelected();
    FhcShowDialog.doShowFhcMultilineItem(selected[0]);
  },

  /**
   * clicked on treecell.
   * 
   * @param event {Event}
   */
  treeClick: function(event) {
    // no action
  },

  /**
   * Select all items.
   */
  selectAll: function() {
    this._getSelection().selectAll();
  },
  
  /**
   * Deselect all items.
   */
  selectNone: function() {
    this._getSelection().clearSelection();
  },

  /**
   * Sort the clicked column. Toggle the sortorder if already sorted.
   *
   * @param treeColumn {DOM element}
   *        the column the user has clicked
   */
  sort: function(treeColumn) {
    this.sortColumn(treeColumn, true);
  },

  /**
   * Sort the column.
   *
   * @param treeColumn {DOM element}
   *        the column the user has clicked
   *
   * @param toggle {Boolean} [Optional]
   *        whether or not to toggle the sortorder of an already sorted column
   *        default is do toggle
   */
  sortColumn: function(treeColumn, toggle) {
    var curSortedCol = this._getCurrentSortedColumn();

    if (toggle == undefined) toggle = false;
    if (treeColumn == undefined) treeColumn = curSortedCol;

    var sortAsc = true;
    if (treeColumn.id != curSortedCol.id) {
      // remove sort indicator of previous sorted column
      this._removeSortIndicator(curSortedCol);
    } else  {
      // set sort direction of new column
      sortAsc = ("ascending" == treeColumn.getAttribute("sortDirection"));
      if (toggle) sortAsc = ! sortAsc;
    }

    this.data.sort(this._getSortCompareFunction(treeColumn.id));
    if (!sortAsc) {
      this.data.reverse();
    }
    this._setSortIndicator(treeColumn, sortAsc);
    this.treeBox.invalidate();
  },

  /**
   * Repopulate the database and repaint the view.
   */
  repopulateView: function() {
    this.alldata = [];
    this.data = [];
    this.treeBox.rowCountChanged(0, -this.rowCount);
    this.treeBox.invalidate();
    this.rowCount = 0;
    this.alldata = this.dbHandler.getAllMultilineItems();
    
    this._applyFilter();
    
    this.rowCount = this.data.length;
    this.treeBox.rowCountChanged(1, this.data.length);

    // re-apply sort and update the count
    this.sortColumn();
    this._updateCountLabel();
  },

  /**
   * Filtertext changed, apply new filter.
   */
  filterChanged: function(domObject) {
    this.treeBox.rowCountChanged(0, -this.rowCount);
    this.treeBox.invalidate();
    
    this._applyFilter();
    
    this.rowCount = this.data.length;
    this.treeBox.rowCountChanged(1, this.data.length);

    // re-apply sort and update the count
    this.sortColumn();
    this._updateCountLabel();
  },
  
  /**
   * When preferences have changed, update the display accordingly.
   *
   * @param domElem {DOM element}
   *        the preference DOM element that has changed
   */
  prefsChanged: function(domElem) {
    //TODO multiline prefsChanged
//    switch (domElem.id) {
//      case "cleanupOnShutdown":
//        this.prefHandler.setCleanupOnShutdown(domElem.checked);
//        break;
//    }
  },

  /**
   * Return the selected multiline items.
   *
   * @returns {Array}
   *          Array of multiline items
   */
  getSelected: function() {
    var selected = [];
    var start = new Object();
    var end = new Object();
    var selection = this._getSelection();
    var rangeCount = selection.getRangeCount();
    for (var r = 0; r < rangeCount; r++) {
      selection.getRangeAt(r,start,end);
      for (var v = start.value; v <= end.value; v++){
        selected.push({
          id:         this.data[v].id,
          name:       this.data[v].name,
          type:       this.data[v].type,
          formid:     this.data[v].formid,
          content:    this.data[v].content,
          host:       this.data[v].host,
          url:        this.data[v].url,
          firstsaved: this.data[v].firstsaved,
          lastsaved:  this.data[v].lastsaved
        });
      }
    }
    return selected;
  },

  /**
   * Get the number of selected cleanup criteria.
   *
   * @returns {number}
   *          the number of selected cleanup criteria items
   */
  getSelectCount: function() {
    var selected = 0;
    var start = new Object();
    var end = new Object();
    var selection = this._getSelection();
    var rangeCount = selection.getRangeCount();
    for (var r = 0; r < rangeCount; r++) {
      selection.getRangeAt(r,start,end);
      for (var v = start.value; v <= end.value; v++) {
        ++selected;
      }
    }
    return selected;
  },

  /**
   * Read general preferences and synchronize with settings displayed by UI.
   */
  readAndShowPreferences: function() {
    //TODO multiline readAndShowPreferences
    //document.getElementById("cleanupOnShutdown").checked = this.prefHandler.isCleanupOnShutdown();
  },

  //----------------------------------------------------------------------------
  // Helper methods
  //----------------------------------------------------------------------------

  /**
   * Workaround for this.treeBox.view.selection.
   * Cannot access this.treeBox.view.selection without a warning in FF4
   * because this.treeBox.view is [xpconnect wrapped]
   * (Warning: reference to undefined property this.treeBox.view)
   */
  _getSelection: function() {
    var tbox = this.treeBox;
    var view = tbox.view;
    return view.selection;
  },
  
  /**
   * Filter on content.
   */
  _applyFilter: function() {
    var filterText = document.getElementById("filterMLText").value;
    var currentHostOnly = document.getElementById("displayhostonly").checked;
    
    var host = "";
    if (currentHostOnly) {
      if (window.opener) {
        var curWindow = window.opener.opener ? window.opener.opener : window.opener;
        host = curWindow.content.document.baseURIObject.host;
      }
    }
    
    this.data = [];
    for(var ii=0; ii<this.alldata.length; ii++) {

      if ("" == host || host == this.alldata[ii].host) {
        if ("" == filterText || FhcUtil.inStr(this.alldata[ii].content, filterText)) {
          this.data.push(this.alldata[ii]);
        }
      }
    }
  },

  /**
   * Update the count-label with the current state.
   */
  _updateCountLabel: function() {
    var msg = this.bundle.getString("historywindow.itemcount.label", [this.rowCount]);
    if (this.alldata.length > this.rowCount) {
      msg += " " + this.bundle.getString("historywindow.itemcountof.label", [this.alldata.length]);
    }
    this.countLabel.setAttribute("value", msg);
  },

  /**
   * Update the countselect-label with the current state.
   */
  _updateSelectCountLabel: function(selectCount) {
    var msg = (1 > selectCount) ? "" : this.bundle.getString("historywindow.selectcount.label", [selectCount]);
    this.selectCountLabel.setAttribute("value", msg);
  },

  /**
   * Remove multiline items, ask for confirmation if more than 1 item is about
   * to be removed.
   *
   * @param items {Array}
   *        array of selected (at least 1) multiline item
   */
  _removeMultiline: function(items) {
    var prefix = "cleanupwindow.prompt.delete.";
    var msg = (1 < items.length)
              ? this.bundle.getString(prefix + "multipleentries", [items.length])
              : this.bundle.getString(prefix + "singleentry");
    if (HistoryWindowControl.confirmDialogWithPref(
        this.bundle.getString(prefix + "title"),  msg, (1 < items.length)))
    {
      window.setCursor("wait");
      try {
        if (this.dbHandler.deleteMultiline(items)) {
          this.repopulateView();
        }
      } finally {
        window.setCursor("auto");
      }
    }
  },

  /**
   * Return the current sorted column (defaults to first column if none found).
   *
   * @returns {DOM element}
   *          the currently sorted column, or the first column if none found
   */
  _getCurrentSortedColumn: function() {
    var sortableCols = ["lastsavedCol", "firstsavedCol", "mlnameCol", "contentCol", "typeCol", "mlhostCol", "mlurlCol"];
    var elem, firstColumn, sortedColumn = null;
    for (var ii=0; ii<sortableCols.length; ii++) {
      elem = document.getElementById(sortableCols[ii]);
      if (ii==0) firstColumn = elem;
      if (elem.getAttribute('sortDirection')) {
        sortedColumn = elem;
        break;
      }
    }
    if (!sortedColumn) {
      sortedColumn = firstColumn;
      sortedColumn.setAttribute("sortDirection", "descending");
    }
    return sortedColumn;
  },

  /**
   * Remove up/down arrow in treeheader indicating the sortdirection.
   *
   * @param columnElem {DOM element}
   *        the treecolumn
   */
  _removeSortIndicator: function(columnElem) {
    if (columnElem) columnElem.removeAttribute("sortDirection");
  },

  /**
   * Set the up/down arrow on a treeColumn indicating the sortdirection.
   *
   * @param columnElem {DOM element}
   *        the treecolumn
   *
   * @param ascending {Boolean}
   *        whether or not the sort direction is ascending
   */
  _setSortIndicator: function(columnElem, ascending) {
    if (columnElem) columnElem.setAttribute("sortDirection", ascending ? "ascending" : "descending");
  },

  /**
   * Get the compare function to sort by a specific column in a treelist .
   *
   * @param   columnId {String}
   *          the Id of the column to sort
   *
   * @returns {Function}
   *          the compare function for sorting an array of multiline items
   */
  _getSortCompareFunction: function(columnId) {
    var compareFunc;

    switch(columnId) {
      case "firstsavedCol":
        compareFunc = function compare(a, b) {
          var result = a.firstsaved - b.firstsaved;
          return result;
        };
        break;

      case "lastsavedCol":
        compareFunc = function compare(a, b) {
          var result = a.lastsaved - b.lastsaved;
          return result;
        };
        break;

      case "mlnameCol":
        compareFunc = function compare(a, b) {
          var result = FhcUtil.stringCompare(a.name, b.name);
          return result;
        };
        break;

      case "contentCol":
        compareFunc = function compare(a, b) {
          var result = FhcUtil.stringCompare(a.content, b.content);
          return result;
        };
        break;

      case "typeCol":
        compareFunc = function compare(a, b) {
          var result = FhcUtil.stringCompare(a.type, b.type);
          return result;
        };
        break;

      case "mlhostCol":
        compareFunc = function compare(a, b) {
          var result = FhcUtil.stringCompare(a.host, b.host);
          return result;
        };
        break;

      case "mlurlCol":
        compareFunc = function compare(a, b) {
          var result = FhcUtil.stringCompare(a.url, b.url);
          return result;
        };
        break;

      default:
        compareFunc = function compare(a, b) {};
        break;
    }
    return compareFunc;
  },



  //----------------------------------------------------------------------------
  // Implementation of the nsITreeView interface
  //----------------------------------------------------------------------------

  // get the cell value (text column)
  getCellText: function(row, column) {
    var multilineObj = this.data[row];
    switch(column.id) {
      case "firstsavedCol":
        return this.dateHandler.toDateString(multilineObj.firstsaved);
      case "lastsavedCol":
        return this.dateHandler.toDateString(multilineObj.lastsaved);
      case "mlnameCol":
        return multilineObj.name;
      case "contentCol":
        return multilineObj.content;
      case "typeCol":
        return multilineObj.type;
      case "mlhostCol":
        return multilineObj.host;
      case "mlurlCol":
        return multilineObj.url;
      default:
        return null;
    }
  },

  isEditable: function(idx, col)  {
    return false;
  },

  setTree: function(treeBox) {
    this.treeBox = treeBox;
  },

  isContainer: function(row) {
    return false;
  },

  isSeparator: function(row) {
    return false;
  },

  isSorted: function() {
    return false;
  },

  getLevel: function(row) {
    return 0;
  },

  getImageSrc: function(row,col) {
    return null;
  },

  getRowProperties: function(row,props) {
    var aserv = Components.classes["@mozilla.org/atom-service;1"]
              .getService(Components.interfaces.nsIAtomService);
    var styleProp = this.prefHandler.getCustomTreeSkin();
    props.AppendElement(aserv.getAtom(styleProp));
},

  getCellProperties: function(row,col,props) {
  },

  getColumnProperties: function(colid,col,props) {
  },

  cycleHeader: function(col) {
  },
  
  
  //----------------------------------------------------------------------------
  // Implementation of the nsIObserverService interface
  //----------------------------------------------------------------------------

  observe: function(subject, topic, data) {
	dump("Observed topic: " + topic + "\n");
  }
}
