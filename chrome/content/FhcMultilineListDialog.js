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
 * The Original Code is FhcMultilineListDialog.
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
 * Dependencies: FhcMultilineListDialog.js, FhcUtil.js, FhcDbHandler.js, 
 *               FhcPreferenceHandler.js
 */
const FhcMultilineListDialog = {
  treeBox: null,
  rowCount: 0,
  
  dbHandler: null,
  prefHandler: null,
  multilineItem: null,
  data: [],
  
  /**
   * Initialize dialog.
   */
  init: function() {
    this.prefHandler = new FhcPreferenceHandler();
    this.dbHandler = new FhcDbHandler();
    
    FhcUtil.isCaseSensitive = this.prefHandler.isSearchCaseSensitive();
    
    document.getElementById("whitelist").hidden = ("multilineblacklist" == this.prefHandler.getMultilineException());
    document.getElementById("blacklist").hidden = ("multilinewhitelist" == this.prefHandler.getMultilineException());
    
    // initialize tree
    var hostTree = document.getElementById("hostTree");
    hostTree.view = this;
    
    // Initialize tree-skin
    this.prefHandler.setCustomTreeSkin(hostTree);

    // initialize edit buttons ()
    this.initEditButtons();

    // get initial data
    this.data.push({host: "host.test.net", id: 0});
    this.data.push({host: "www.apple.com", id: 1});
    this.data.push({host: "me.nowhere.com", id: 2});
    this.data.push({host: "www.mozilla.blog.com", id: 3});
    
    this.rowCount = this.data.length;
    this.treeBox.rowCountChanged(0, this.data.length);
    this.treeBox.invalidate();
    
    this._sortColumn();
  },

  /**
   * Extension close.
   */
  destroy: function() {
    this.data = null;
    delete this.dbHandler;
    delete this.prefHandler;
    return true;
  },
  
  initEditButtons: function() {
    var txtHost = document.getElementById("host");
    var btnAdd = document.getElementById("addHost");
    var btnUpdate = document.getElementById("updateHost");
    var btnRemove = document.getElementById("deleteHost");
    var btnAddCurrent = document.getElementById("addCurrent");

    var selectCount = this._getSelectCount();
    var isExisting = this._isHostInList(txtHost.value);
    var curHost = this._getCurrentHost();
    var isCurHostInList = this._isHostInList(curHost);
    
    // enable add-button only when host textbox is not empty and host
    // is not in the list 
    btnAdd.setAttribute("disabled", (txtHost.value.length == 0) || isExisting);
    
    // enable update-button only when host textbox is not empty, host
    // is not in the list and one item is selected
    btnUpdate.setAttribute("disabled", (1 != selectCount) || (txtHost.value.length == 0) || isExisting);
    
    // enable delete-button only when 1 item is selected
    btnRemove.setAttribute("disabled", 1 != selectCount);
    
    // enable add-current-button only when current host not in list
    btnAddCurrent.setAttribute("disabled", curHost.length==0 || isCurHostInList);
  },


  addCurrent: function() {
    // determine current host
    var host = this._getCurrentHost();
    
    if (!this._isHostInList(host)) {
      this._addItem({
        id: 888,
        host: host
      });
    }
  },
  
  addItem: function() {
    this._addItem({
      id: 999,
      host: document.getElementById("host").value
    });
  },
  
  _addItem: function(item) {
    this.data.push(item);
    
    this.rowCount = this.data.length;
    this.treeBox.rowCountChanged(this.data.length-1, 1);
    
    // select new item
    var selection = this._getSelection()
    selection.select(this.data.length-1);
    
    // re-apply sort
    this._sortColumn();

    // make sure new item is visible
    var idx = this._getDataIndex(item);
    this.treeBox.ensureRowIsVisible(idx);


    this.initEditButtons();
  },
  
  updateItem: function() {
    var txtHost = document.getElementById("host");
    var id = txtHost.getAttribute("hostId");
    
    for (var i=0; i<this.data.length; i++) {
      if (id == this.data[i].id) {
        this.data[i].host = txtHost.value;
        this.treeBox.invalidate();
        
        // stop iterating
        i = this.data.length;
      }
    }
    
    // re-apply sort
    this._sortColumn();
    
    this.initEditButtons();
  },
  
  deleteItem: function() {
    // check if 1 item is selected which may not be the case for delete-key
    var count = this._getSelectCount();
    if (count == 0) return;
    
    var curSelectedIndex = this._getSelectedIndex();
    
    var txtHost = document.getElementById("host");
    var id = txtHost.getAttribute("hostId");
    
    for (var i=0; i<this.data.length; i++) {
      if (id == this.data[i].id) {
        this.data.splice(i, 1);
        this.rowCount = this.data.length;
        this.treeBox.rowCountChanged(i, -1);
         
        // stop iterating
        i = this.data.length;
      }
    }
    
    // select next (or last) item
    if (this.data.length > 0) {
      if (curSelectedIndex > this.data.length-1) {
        curSelectedIndex = this.data.length-1;
      }
      var selection = this._getSelection();
      selection.select(curSelectedIndex);
    }
    
    this.initEditButtons();
  },

  _getCurrentHost: function() {
    var host = "";
    
    var curWindow = window;
    while (curWindow.opener) {
      curWindow = curWindow.opener;
    }
    
    var mainDocument = curWindow.content.document;
    if (mainDocument && mainDocument.baseURIObject) {
      if (mainDocument.baseURIObject.schemeIs("file")) {
        host = "localhost";
      } else if ("about" != mainDocument.baseURIObject.scheme) {
        host = mainDocument.baseURIObject.host;
      }
    }
    return host;
  },

  _isHostInList: function(host) {
    var isExisting = false;
    if (host && host.length > 0) {
      for (var i=0; i<this.data.length && !isExisting; i++) {
        isExisting = (host == this.data[i].host);
      }
    }
    return isExisting;
  },
  
  /**
   * Get the index of item within the internal data array.
   */
  _getDataIndex: function(item) {
    for (var i=0; i<this.data.length; i++) {
      if (item.id == this.data[i].id) {
        return i;
      }
    }
    return -1;
  },
  
    
  /**
   * Tree row is selected, enable/disable buttons.
   *
   * @param event {Event}
   */
  treeSelect: function(event) {
    var txtHost = document.getElementById("host");
    
    var sel = this._getSelected();
    if (sel.length == 1) {
      txtHost.value = sel[0].host;
      txtHost.setAttribute("hostId", sel[0].id);
    } else {
      txtHost.value = "";
      txtHost.removeAttribute("hostId");
    }
    
    this.initEditButtons();
  },

  /**
   * Sort the clicked column. Toggle the sortorder if already sorted.
   *
   * @param treeColumn {DOM element}
   *        the column the user has clicked
   */
  sort: function(treeColumn) {
    this._sortColumn(treeColumn, true);
  },


  
  
  //----------------------------------------------------------------------------
  // Tree related methods
  //----------------------------------------------------------------------------

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
  _sortColumn: function(treeColumn, toggle) {
    // save original selection
    var orgSelection = this._getSelected();
    
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
    
    this._restoreSelection(orgSelection);
  },
  
  /**
   * Get the number of selected items.
   *
   * @returns {number}
   *          the number of selected items
   */
  _getSelectCount: function() {
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
   * Return the selected items.
   *
   * @returns {Array}
   *          Array of selected items
   */
  _getSelected: function() {
    var selected = [];
    var start = new Object();
    var end = new Object();
    var selection = this._getSelection();
    var rangeCount = selection.getRangeCount();
    for (var r = 0; r < rangeCount; r++) {
      selection.getRangeAt(r,start,end);
      for (var v = start.value; v <= end.value; v++){
        selected.push({
          id:   this.data[v].id,
          host: this.data[v].host
        });
      }
    }
    return selected;
  },
  
  /**
   * restore a selection.
   *
   */
  _restoreSelection: function(entriesToSelect) {
    // create a hashmap of id's from the entriesToSelect
    var key, hashMap = new Array();
    for(var ii=0; ii < entriesToSelect.length; ii++) {
      key = entriesToSelect[ii].id;
      hashMap[key] = key;
    }

    // set the _tmpSelected flag in preparation of the _restoreSelectionFast
    // method
    for (var it=0; it < this.data.length; it++) {
      this.data[it]._tmpSelected = !(undefined == hashMap[this.data[it].id]);
    }
    delete hashMap;

    // restore the selection
    this._restoreSelectionFast();
  },
  
  /**
   * Restore selection(s) from the data itself, very fast because
   * whether or not data is selected is stored inside the data itself.
   * Only works when the data itself is not changed between save & restore!
   */
  _restoreSelectionFast: function() {
    var selection = this._getSelection();

    // clear the current selection
    selection.clearSelection();

    this.treeBox.beginUpdateBatch();
    var firstSelectedRow = null, rangeBegin;
    for (var ii=0; ii < this.data.length; ii++) {
      if (this.data[ii]._tmpSelected) {
        if (!firstSelectedRow) firstSelectedRow = ii;
        // speedup: select ranges
        rangeBegin = ii;
        while(ii+1 < this.data.length && this.data[ii+1]._tmpSelected) {
          ii++;
        }
        selection.rangedSelect(rangeBegin, ii, true);
      }
    }
    if (firstSelectedRow != null) {
      this.treeBox.ensureRowIsVisible(firstSelectedRow);
    }
    this.treeBox.endUpdateBatch();
  },

  /**
   * Get the index within the data array of the first selected item.
   */
  _getSelectedIndex: function() {
    var start = new Object();
    var end = new Object();
    var selection = this._getSelection();
    var rangeCount = selection.getRangeCount();
    if (rangeCount > 0) {
      selection.getRangeAt(0,start,end);
      return start.value;
    }
    return 0;
  },
  
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
   * Return the current sorted column (defaults to first column if none found).
   *
   * @returns {DOM element}
   *          the currently sorted column, or the first column if none found
   */
  _getCurrentSortedColumn: function() {
    var sortableCols = ["hostCol"];
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
      sortedColumn.setAttribute("sortDirection", "ascending");
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
   * Get the compare function to sort by a specific column in a treelist.
   *
   * @param   columnId {String}
   *          the Id of the column to sort
   *
   * @returns {Function}
   *          the compare function for sorting an array of regexp items
   */
  _getSortCompareFunction: function(columnId) {
    var compareFunc;

    switch(columnId) {
      case "hostCol":
        compareFunc = function compare(a, b) {
          var result = FhcUtil.stringCompare(a.host, b.host);
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
  getCellText: function(row, column) {
    var dataObj = this.data[row];
    switch(column.id) {
      case "hostCol":
        return dataObj.host;
      case "indexCol":
        return dataObj.id;
      default:
        return null;
    }
  },
  
  // get the cell value (checkbox-column)
  getCellValue: function(row, col) {
    var dataObj = this.data[row];
    switch(col.id) {
      default:
        return false;
    }
  },

  // update the cell value (text-column), called when editing in treecell (isEditable)
  setCellText: function(row, column, newValue) {
    var dataObj = this.data[row];
    var oldValue = "";
    switch(column.id) {
      case "hostCol":
           oldValue = dataObj.host;
           dataObj.host = newValue;
           break;
    }
    if (oldValue != newValue) {
      this._updateHost(dataObj);
    }
  },

  // update the cell value (checkbox-column)
  setCellValue: function(row, col, newValue) {
    var dataObj = this.data[row];
    var oldValue = null;
    var newValueNum = ("true" == newValue) ? "1" : "0";
    switch(col.id) {
    }

    if (oldValue != null && oldValue != newValueNum) {
      this._updateHost(dataObj);
    }
  },

  isEditable: function(idx, col)  {
    // all columns editable except the index column
    return (col.id != "indexCol");
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
  }
}