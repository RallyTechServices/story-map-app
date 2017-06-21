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
        console.log('state', state && state.value);
        if (state && state.value){
          this.store.on('load', function() {
            console.log('store loaded', state.value);
              this.setValue(state.value);
              this.saveState();
          }, this, {single: true});
          this.store.load();
        }
      }
});
