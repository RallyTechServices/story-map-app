Ext.override(Rally.ui.cardboard.row.Row, {
        /**
         * Determine whether the specified record belongs in this row
         * @param {Rally.data.Model} record
         * @returns {Boolean}
         */
        isMatchingRecord: function(record) {
            var recordValue = record.get(this.getFieldDef().name),
                rowValue = this.getRowDisplayValue() ? this.getRowDisplayValue() : null;

            var recordFieldName = recordValue && recordValue.Name ? recordValue.Name.toLowerCase() : null;

            return ((rowValue && rowValue.toLowerCase()) === recordFieldName);
        },

        // isMatchingRecord: function(record) {
        //     var recordValue = record.get(this.getFieldDef().name),
        //         rowValue = this.getRowValue();

        //     return (rowValue === recordValue ||
        //         (Rally.util.Ref.isRefUri(rowValue) &&
        //             Rally.util.Ref.getRelativeUri(recordValue) === Rally.util.Ref.getRelativeUri(rowValue)));
        // },
});

Ext.override(Rally.ui.combobox.ArtifactSearchComboBox, {

      applyState: function(state) {
        if (state && state.value && state.value !== null){

          this.store.on('load', function() {

              this.setValue(state.value);
              this.value = state.value ;
              this.saveState();
              this.fireEvent('stateloaded');
          }, this, {single: true});
          this.store.load();
        }
      }
});

Ext.override(Rally.ui.cardboard.plugin.CollapsibleColumns, {

_calculateColumnWidth: function() {
         if (!this.columnExpanded) {
             return this.self.COLLAPSED_WIDTH;
         } else {
             var visibleColumns = this.cardboard.getVisibleColumns();
             var expandedCount = this._numberOfExpandedColumns(visibleColumns);
             var collapsedCount = visibleColumns.length - expandedCount;

             _.each(visibleColumns, function (column) {
                 if (column !== this.column && this._isColumnExpanded(column)) {
                     column.getColumnHeaderCell().setWidth('auto');
                 }
             }, this);
             console.log('this.cardboard.', this.cardboard.getWidth(), ' visible columns ', visibleColumns, ' expandedCount ', expandedCount, ' collapsedCount ', collapsedCount);
             return (this.cardboard.getWidth() - collapsedCount * this.self.COLLAPSED_WIDTH) / expandedCount;
         }
     },
     _resizeColumn: function (immediate) {
          var width = this._calculateColumnWidth();
          console.log('_resizeColumn', width);
          var animPromises = [];

          if (immediate) {
              var deferred = Ext.create('Deft.Deferred');
              animPromises.push(deferred.promise);
              Ext.defer(function() {
                  deferred.resolve();
              }, 1);

              var els = _.compact(this.column.getContentCellContainers().concat([
                  this.column.getColumnHeaderCell(),
                  this.sizingCell
              ]));
              _.invoke(els, 'setWidth', this.columnExpanded ? 'auto' : width);
          } else {
              this._animating = true;
              animPromises.push(this._animateResize(this.column.getColumnHeaderCell(), width));
              _.each(this.column.getContentCellContainers(), function(cell) {
                  animPromises.push(this._animateResize(cell, width));
              }, this);
              if(this.sizingCell) {
                  animPromises.push(this._animateResize(this.sizingCell, width));
              }
              if (!this.columnExpanded) {
                  animPromises.push(this._animate(this.collapsedTitle, {
                      from: { top: '-200px', opacity: 0 },
                      to: { top: '-14px', opacity: 1 }
                  }));
              }
          }

          return Deft.Promise.all(animPromises).always(function () {
              delete this._animating;
          }, this);
      },
});
