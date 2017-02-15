Ext.override(Rally.ui.cardboard.CardBoard, {
        _parseRows: function() {
            if(this.rowConfig) {
                var fieldDef = this.rowConfig.fieldDef = this.getModel().getField(this.rowConfig.field);
                return this._getAllowedValues(fieldDef).then({
                    success: function(allowedValues){
                        //console.log('allowedValues',allowedValues);
                        if(allowedValues){
                            this.rowConfig.values = allowedValues.values;
                            if(allowedValues.sortDirection) {
                                this.rowConfig.sortDirection = allowedValues.sortDirection;
                            }
                        }
                    },
                    scope: this
                });
            }
            return Deft.Promise.when();
        },
        _getAllowedValues: function(fieldDef){
            //console.log('fieldDef',fieldDef);
            if(fieldDef) {
                if (fieldDef.attributeDefinition.AttributeType.toLowerCase() === 'boolean') {
                    return Deft.Promise.when({
                        values: [true, false],
                        sortDirection: 'DESC'
                    });
                } else if (fieldDef.attributeDefinition.Constrained && fieldDef.attributeDefinition.AttributeType.toLowerCase() !== 'object') {
                    return fieldDef.getAllowedValueStore().load().then({
                        success: function (records) {
                            var values = _.invoke(records, 'get', 'StringValue');
                            if (fieldDef.attributeDefinition.Custom) {
                                Ext.Array.sort(values, function (a, b) {
                                    a = a.toLowerCase();
                                    b = b.toLowerCase();
                                    return a < b ? -1 : (a > b ? 1 : 0);
                                });
                                if (_.isEmpty(values[0])) {
                                    values.push(values.shift());
                                }
                            } else if (fieldDef.attributeDefinition.AttributeType.toLowerCase() === 'rating' && !values[0]) {
                                values[0] = 'None';
                            }
                            return {
                                values: values
                            };
                        },
                        scope: this
                    });
                }
            }
            return Deft.Promise.when();
        },

        _createRow: function(rowConfig, applySort) {
            //console.log('calling create row',rowConfig);
            var collapsed = false;
            if (this.rowConfig && this.rowConfig.field && this.state && this.state.collapsedRows) {
                var rowKey = this._getRowKey(this.rowConfig.field, rowConfig.value);
                collapsed = this.state.collapsedRows.hasOwnProperty(rowKey);
            }

            var defaultRowConfig = {
                el: this.getEl().down('tbody.columns'),
                columns: this.columnDefinitions,
                context: this.getAppContextOrEnvironmentContext(),
                fieldDef: this.rowConfig && this.rowConfig.fieldDef,
                collapsed: collapsed
            };

            if (this.rowConfig) {
                if(this.rowConfig.headerConfig) {
                    defaultRowConfig.headerConfig = this.rowConfig.headerConfig;
                }
                if(this.rowConfig.sortField) {
                    defaultRowConfig.sortField = this.rowConfig.sortField;
                }
            }

            var row = Ext.create('Rally.ui.cardboard.row.Row',
                Ext.apply(defaultRowConfig, rowConfig)),
                sortIndex = applySort ? this._getSortedIndex(row) : this.rowDefinitions.length;
            this.rowDefinitions.splice(sortIndex, 0, row);
            row.insert(this.rowDefinitions[sortIndex + 1]);

            if(row.isCollapsible()) {
                row.on('collapse', this.saveState, this);
                row.on('expand', this.saveState, this);
            }
            //console.log('_createRow',row);
            return row;
        },

        _hasValidRowField: function() {
            return this.rowConfig &&
                _.every(this.getModels(), function(model){ return model.hasField(this.rowConfig.field); }, this);
        },

        /**
         * Get a row for the specified card or record
         * If a matching row does not yet exist it will be created.
         * @param {Rally.ui.cardboard.Card|Rally.data.Model} item The item which needs a row
         * @return {Rally.ui.cardboard.row.Row}
         */
        getRowFor: function (item) {
            var rows = this.getRows(),
                record = item.isModel ? item : item.getRecord(),
                row;

            if (this._hasValidRowField()) {
                row = _.find(rows, function (row) {
                    return row.isMatchingRecord(record);
                }) ||
                this._createRow({
                    showHeader: true,
                    value: record.get(this.rowConfig.field)
                }, true);
            } else {
                row = rows[0] || this._createDefaultRow();
            }

            return row;
        },


        /**
         * @private
         */
        _onColumnReady: function (column, records) {
            this._columnsLoaded = this._columnsLoaded || 0;
            this._columnsLoaded++;
            this.fireEvent('columnready', column, this);
            if (this._columnsLoaded === this.columnDefinitions.length) {
                this._onAllColumnsReady();

                if(!this.getRows().length) {
                    if(this.rowConfig) {
                        this._createRow({
                            showHeader: true,
                            value: null,
                            isBlankSlate: true
                        });
                    } else {
                        this._createDefaultRow();
                    }
                }
            }
        },

        /**
         * Render the columns. Fires 'aftercolumnrender' when complete.
         * @private
         */
        _renderColumns: function () {
            if (this.columnDefinitions.length > 0) {
                this._calculateMinWidth();

                this.getEl().update(this._getColumnContainerHtml());
                //console.log('this.rowConfig.values',this.rowConfig.values);
                this.rowDefinitions = [];
                if(this._hasValidRowField()) {
                    _.each(this.rowConfig.values, function(rowValue) {
                        this._createRow({
                            showHeader: true,
                            value: rowValue
                        });
                    }, this);
                } else {
                    this._createRow({showHeader: false, isDefault: true});
                }

                this._addColumnsToDom();

                this.fireEvent('aftercolumnrender', this);
            }
        },        

});


Ext.override(Rally.ui.cardboard.row.Header, {

    _getTitle: function() {
        var value = this.getValue();

        if(Ext.isObject(value)) {
            var objectValue = value._refObjectName;
            if (value.FormattedID) {
                var tpl = Ext.create('Rally.ui.renderer.template.FormattedIDTemplate', {
                    showIcon: true,
                    showHover: false
                });
                value = tpl.apply(value) + ': ' + objectValue;
            } else {
                value = objectValue;
            }
        }

        var fieldDef = this.getFieldDef();

        if(_.isUndefined(value) || _.isNull(value) || value === '') {
            value = '-- None --';
        } else if (fieldDef.getType && fieldDef.getType() === 'boolean'){
            var booleanValue = value === true ? 'Yes' : 'No';
            value = fieldDef.displayName + ': ' + booleanValue;
        } else if (fieldDef.name === 'PlanEstimate') {
            value += ' ' + this.getContext().getWorkspace().WorkspaceConfiguration.IterationEstimateUnitName;
        } else if (fieldDef.name === 'Estimate') {
            value += ' ' + this.getContext().getWorkspace().WorkspaceConfiguration.TaskUnitName;
        }
        //console.log('Row Header value',value);
        return value;
    }
});


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
            // return (rowValue === recordValue ||
            //     (Rally.util.Ref.isRefUri(rowValue) &&
            //         Rally.util.Ref.getRelativeUri(recordValue) === Rally.util.Ref.getRelativeUri(rowValue)));
            console.log('rowValue,recordFieldName',rowValue,recordFieldName,(rowValue && rowValue.toLowerCase() === recordFieldName));
            return ((rowValue && rowValue.toLowerCase()) === recordFieldName);
        },

        // isMatchingRecord: function(record) {
        //     var recordValue = record.get(this.getFieldDef().name),
        //         rowValue = this.getRowValue();

        //     return (rowValue === recordValue ||
        //         (Rally.util.Ref.isRefUri(rowValue) &&
        //             Rally.util.Ref.getRelativeUri(recordValue) === Rally.util.Ref.getRelativeUri(rowValue)));
        // },

        /**
         * Get the effective value of this row.  Used to update records when dropping in this row instance.
         * @returns {String|Number}
         */
        getRowValue: function() {
            var value = this.getValue();
            if(Ext.isObject(value)) {
                value = Rally.util.Ref.getRelativeUri(value);
            }
            return value;
        },

        /**
         * Get the effective display value of this row.
         * @returns {String|Number}
         */
        getRowDisplayValue: function() {
            var value = this.getValue();
            if (Ext.isObject(value)) {
                value = value._refObjectName;
            }
            if (Ext.isString(value)) {
                value = value.toLowerCase();
            }
            return value;
        }        

});