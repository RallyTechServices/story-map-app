Ext.define('Rally.ui.cardboard.plugin.CollapsibleColumns2', {
    alias: 'plugin.rallycardboardcollapsiblecolumns2',
    extend: 'Ext.AbstractPlugin',
    requires: [
        'Deft.Deferred',
        'Rally.ui.tooltip.ToolTip'
    ],
    stateful: true,
    statics: { COLLAPSED_WIDTH: 25 },
    mixins: ['Rally.clientmetrics.ClientMetricsRecordable'],

    clientMetrics: [
        {
            method: '_userInitiatedCollapse',
            description: 'collapsed column'
        },
        {
            method: '_userInitiatedExpand',
            description: 'expanded column'
        }
    ],

    init: function(column) {
        this.callParent(arguments);
        this.column = column;
        this.cardboard = column.ownerCardboard;

        this.columnExpanded = this._setInitialState();

        this.originalGetMinWidth = this.column.getMinWidth;
        this.column.getMinWidth = Ext.bind(this.getMinWidth, this);

        this.originalShouldAutoLoadMoreRecords = this.column._shouldAutoLoadMoreRecords;
        this.column._shouldAutoLoadMoreRecords = Ext.bind(this._shouldAutoLoadMoreRecords, this);

        this.column.mon(this.column, 'afterrender', this._afterColumnRender, this);
        this.column.mon(this.cardboard, 'columnvisibilitychanged', this._onColumnVisibilityChanged, this);

        this.column.on('rowadd', this._onColumnRowAdd, this);
    },

    destroy: function() {
        this._cleanupColumnNameTooltip();
        this.callParent(arguments);
    },

    _setInitialState: function() {
        var columnValue = this.column.getValue() || 'nullValue';
        this.stateId = this.column.getContext().getScopedStateId(columnValue + '-collapsible');
        var state = Ext.state.Manager.get(this.stateId);
        return state ? state.expanded : true;
    },

    _onColumnClick: function () {
        if (!this.columnExpanded) {
            this.expand(Ext.isIE10m);
        }
    },

    _onColumnRowAdd: function(column, row) {
        var contentCell = row.getContentCellFor(column),
            contentCellContainer = contentCell.parent();
        contentCell.setVisibilityMode(Ext.Element.DISPLAY);
        this._setClassForCollapseState(contentCellContainer, !this.columnExpanded);
        contentCellContainer.on('click', this._onColumnClick, this);
    },

    _setClassesForCollapseState: function(isCollapsed) {
        this.column.getColumnHeaderCell().addCls(isCollapsed ? 'collapsed' : 'collapsible').removeCls(isCollapsed ? '' : 'collapsed');
        _.each(this.column.getContentCellContainers(), function(cell) {
            this._setClassForCollapseState(cell, isCollapsed);
        }, this);
    },

    _setClassForCollapseState: function(cell, isCollapsed) {
        cell.addCls(isCollapsed ? 'collapsed' : 'collapsible').addCls('collapsible');
        cell.removeCls(isCollapsed ? '' : 'collapsed');
    },

    _boardHasRows: function() {
        return this.cardboard.rowConfig;
    },

    _afterColumnRender: function() {
         this.column.on('showpolicy', this._onPolicyChange, this);
         this.column.on('hidepolicy', this._onPolicyChange, this);

         this._setClassesForCollapseState(false);

         this._addHoverListener(Ext.Array.merge(this.column.getColumnHeaderCell(), this.column.getContentCells()));

         this.column.getColumnHeader().getEl().setVisibilityMode(Ext.Element.DISPLAY);
         _.invoke(this.column.getContentCells(), 'setVisibilityMode', Ext.Element.DISPLAY);

         this._addCollapseComponents();

        // if(this._boardHasRows()) {
        //    this._addHiddenSizingRow();
        // }

         if (!this.columnExpanded) {
             this.collapse(true);
             this._addColumnNameTooltip();
         }
    },

    _addHiddenSizingRow: function() {
        var columnsTBody = this.column.getEl().up('.cardboard').down('.columns'),
            sizingCellContainer = columnsTBody.down('.sizing-container');

        if(!sizingCellContainer) {
            sizingCellContainer = columnsTBody.insertFirst({
                tag: 'tr',
                cls: 'sizing-container'
            });
        }
        this.sizingCell = sizingCellContainer.appendChild({
            tag: 'td',
            cls: 'sizing-cell'
        });
    },

    _addColumnNameTooltip: function() {
        if (!this.columnHeaderTooltip) {
            this.columnHeaderTooltip = Ext.create('Rally.ui.tooltip.ToolTip', {
                target: this.column.getColumnHeaderCell(),
                delegate: '.collapsed-tooltip-target',
                hideDelay: 100,
                anchor: 'left',
                mouseOffset: [2, 2],
                html: this.column.getColumnHeader().getHeaderValue()
            });
        }
    },

    _cleanupColumnNameTooltip: function() {
        if (this.columnHeaderTooltip) {
            this.columnHeaderTooltip.destroy();
            delete this.columnHeaderTooltip;
        }
    },

    _addCollapseComponents: function() {
        var container = Ext.DomHelper.insertFirst(this.column.getColumnHeaderCell(), {
            tag: 'div',
            cls: 'expand-collapse-container'
        });

        if (this._boardHasRows()) {
            Ext.DomHelper.insertAfter(container, {
                tag: 'div',
                cls: 'collapsed-title-fade collapsed-tooltip-target'
            });
        }

        this.collapseButton = this._createButton(true, container);
        this.expandButton = this._createButton(false, container);
        this.collapsedTitle = Ext.create('Ext.Component', {
            cls: 'collapsed-title collapsed-tooltip-target',
            renderTo: Ext.isIE8 ? this.column.getContentCells()[0] : container,
            html: this.column.getColumnHeader().getHeaderValue(),
            hidden: this.columnExpanded,
            hideMode: 'display'
        });
    },

    _createButton: function(isCollapseButton, container) {
        return Ext.create('Rally.ui.Button', {
            cls: (isCollapseButton ? 'icon-collapse-column' : 'icon-expand-column') + ' expand-collapse',
            frame: false,
            handler: function () {
                if (isCollapseButton) {
                    this._userInitiatedCollapse();
                } else {
                    this._userInitiatedExpand();
                }
            },
            renderTo: container,
            hidden: isCollapseButton ? !this.columnExpanded : this.columnExpanded,
            scope: this
        });
    },

    _addHoverListener: function (cells) {
        _.each(cells, function (cell) {
            cell.on('mouseover', function () { this._modifyHoverClasses('addCls', cells); }, this);
            cell.on('mouseout', function () { this._modifyHoverClasses('removeCls', cells); }, this);
        }, this);
    },

    _modifyHoverClasses: function (methodName, cells) {
        _.invoke(cells, methodName, ['mouseover']);
    },

    _onColumnVisibilityChanged: function () {
        if (this.columnExpanded && this.collapseButton) {
            this.collapseButton.setVisible(!this._isLastExpandedColumn());
        }
    },

    getMinWidth: function () {
        return this.columnExpanded ? this.originalGetMinWidth.call(this.column) : this.self.COLLAPSED_WIDTH;
    },

    _shouldAutoLoadMoreRecords: function () {
        return this.columnExpanded && this.originalShouldAutoLoadMoreRecords.call(this.column);
    },

    _collapseExpandSetup: function (collapsing) {
        this.columnExpanded = !collapsing;
        this._saveState();

        if (collapsing) {
            this.collapseButton.hide();
            this.collapsedTitle.show();
            this.column.getColumnHeader().getEl().hide();
            _.invoke(this.column.getContentCells(), 'hide');
            this._setClassesForCollapseState(true);
        } else {
            this.expandButton.hide();
            this.collapsedTitle.hide();
            this.column.getColumnHeader().getEl().show();
        }
    },

    _collapseExpandSuccess: function(collapsing) {
        this.cardboard.fireEvent('headersizechanged', this);
        this.cardboard.fireEvent('columnvisibilitychanged', this);

        if (collapsing) {
            this.expandButton.show();
            this.column.dropControllerPlugin.disable();

            Ext.defer(function() {
                _.invoke(this.column.getContentCellContainers(), 'on', 'click', this._onColumnClick, this);
                this.column.getColumnHeaderCell().on('click', this._onColumnClick, this);
            }, 1, this);

        } else {
            this.collapseButton.show();
            _.invoke(this.column.getContentCells(), 'show');
            this.column.dropControllerPlugin.enable();
            this._setClassesForCollapseState(false);
            _.invoke(this.column.getContentCellContainers(), 'un', 'click', this._onColumnClick, this);
            this.column.getColumnHeaderCell().un('click', this._onColumnClick, this);
        }
    },

    _userInitiatedCollapse: function() {
        this.collapse(Ext.isIE10m);
    },

    collapse: function(immediate) {
        if (this._animating || this._isLastExpandedColumn()) {
            return;
        }

        this._addColumnNameTooltip();

        this._collapseExpandSetup(true);

        if (!immediate) {
            this.collapsedTitle.getEl().setOpacity(0);
        }

        return this._resizeColumn(immediate).then({
            success: function () {
                this._collapseExpandSuccess(true);
            },
            scope: this
        });
    },

    _userInitiatedExpand: function() {
        this.expand(Ext.isIE10m);
    },

    expand: function(immediate) {
        if (this._animating) {
            return;
        }

        this._cleanupColumnNameTooltip();
        this._collapseExpandSetup(false);

        this.column.autoLoadCards();
        return this._resizeColumn(immediate).then({
            success: function () {
                this._collapseExpandSuccess(false);
            },
            scope: this
        });
    },

    _saveState: function () {
        if (this.stateful) {
            Ext.state.Manager.set(this.stateId, { expanded: this.columnExpanded });
        }
    },

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

            return (this.cardboard.getWidth() - collapsedCount * this.self.COLLAPSED_WIDTH) / expandedCount;
        }
    },

    _numberOfExpandedColumns: function(columns) {
        return _.filter(columns, function (column) { return this._isColumnExpanded(column); }, this).length;
    },

    _isColumnExpanded: function(column) {
        var collapsiblePlugin = column.findPlugin(this.ptype);
        return collapsiblePlugin ? collapsiblePlugin.columnExpanded : true;
    },

    _resizeColumn: function (immediate) {
        var width = this._calculateColumnWidth();

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

    _isLastExpandedColumn: function () {
        return this.columnExpanded && this._numberOfExpandedColumns(this.cardboard.getVisibleColumns()) === 1;
    },

    _animate: function (cell, options) {
        var deferred = Ext.create('Deft.Deferred');
        cell.animate(Ext.merge({
            duration: 500,
            listeners: {
                afteranimate: function () { deferred.resolve(); },
                scope: this
            }
        }, options));
        return deferred.promise;
    },

    _animateResize: function(cell, width) {
        return this._animate(cell, {
            to: { width: width + 'px' }
        }).then({
            success: function () {
                if (this.columnExpanded) {
                    cell.setWidth('auto');
                }
            },
            scope: this
        });
    },

    _onPolicyChange: function() {
        this._resizeColumn(true);
    }
});
