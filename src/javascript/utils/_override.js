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

Ext.override(Rally.ui.cardboard.plugin.Scrollable,{
    _addScrollButtons: function() {
        if (this.cmp.backwardsButton) {
            this.cmp.backwardsButton.destroy();
        }

        if (this.cmp.forwardsButton) {
            this.cmp.forwardsButton.destroy();
        }

        this.callParent(arguments);
    }

});
