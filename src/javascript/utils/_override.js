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