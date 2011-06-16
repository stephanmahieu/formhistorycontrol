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
    
    // initialize tree
    var formTree = document.getElementById("hostTree");
    formTree.view = this;
    
    // Initialize tree-skin
    this.prefHandler.setCustomTreeSkin(formTree);

    // initialize edit buttons ()
    this.initEditButtons();

    // get initial data
    this.data.push({host: "host.test.net", id: 0});
    this.data.push({host: "www.apple.com", id: 1});
    this.data.push({host: "me.nowhere.com", id: 2});
    this.data.push({host: "www.mozilla.blog.com", id: 3});
    this.treeBox.rowCountChanged(0, this.data.length);
    this.treeBox.invalidate();
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
  
  addItem: function() {
    this.data.push({
      id: 999,
      host: document.getElementById("host").value
    });
    this.treeBox.rowCountChanged(this.data.length-1, 1);
    
    // select new item
    var selection = this._getSelection()
    selection.select(this.data.length-1);
    this.treeBox.ensureRowIsVisible(this.data.length-1);
    
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
    
    this.initEditButtons();
  },
  
  deleteItem: function() {
    // check if 1 item selected which may not be the case for delete-key
    var count = this.getSelectCount();
    if (count == 0) return;
    
    var curSelectedIndex = this._getSelectedIndex();
    
    var txtHost = document.getElementById("host");
    var id = txtHost.getAttribute("hostId");
    
    for (var i=0; i<this.data.length; i++) {
      if (id == this.data[i].id) {
        this.data.splice(i, 1);
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
  

  sort: function() {
    
  },
  
  /**
   * Tree row is selected, enable/disable buttons.
   *
   * @param event {Event}
   */
  treeSelect: function(event) {
    var txtHost = document.getElementById("host");
    
    var sel = this.getSelected();
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
   * Get the number of selected items.
   *
   * @returns {number}
   *          the number of selected items
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
   * Return the selected items.
   *
   * @returns {Array}
   *          Array of selected items
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
          id:   this.data[v].id,
          host: this.data[v].host
        });
      }
    }
    return selected;
  },
  
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
  
  initEditButtons: function() {
    var selectCount = this.getSelectCount();
    
    var txtHost = document.getElementById("host");
    var btnAdd = document.getElementById("addHost");
    var btnUpdate = document.getElementById("updateHost");
    var btnRemove = document.getElementById("deleteHost");

    var isExisting = false;
    if (txtHost.value.length > 0) {
      for (var i=0; i<this.data.length && !isExisting; i++) {
        isExisting = (txtHost.value == this.data[i].host);
      }
    }
    
    // enable add-button only when host textbox is not empty and host
    // is not in the list 
    btnAdd.setAttribute("disabled", (txtHost.value.length == 0) || isExisting);
    
    // enable update-button only when host textbox is not empty, host
    // is not in the list and one item is selected
    btnUpdate.setAttribute("disabled", (1 != selectCount) || (txtHost.value.length == 0) || isExisting);
    
    // enable delete-button only when 1 item is selected
    btnRemove.setAttribute("disabled", 1 != selectCount);
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
      case "indexCol":
        return this.data[row].id;
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