Ext.define("TSApp", {
    extend: 'Rally.app.App',
    settingsScope: 'workspace',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    defaults: { margin: 10 },
    items: [
        {xtype:'container',itemId:'selector_box', layout: 'hbox'},
        {xtype:'container',itemId:'display_box'}
    ],

    integrationHeaders : {
        name : "TSApp"
    },

    config: {
        defaultSettings: {
            selectorType: ''    
        }
    },    
    
    getSettingsFields: function() {
        var me = this;
        var typeFilters = [{property: 'TypePath', operator: 'contains', value: 'PortfolioItem/'}];
        var settings = [{
                name: 'selectorType',
                fieldLabel: 'Select 2nd Level PI',
                xtype: 'rallyportfolioitemtypecombobox',
                displayField: 'DisplayName',
                valueField: 'TypePath',
                readyEvent: 'ready'
            },
            {
                name: 'defaultRelease',
                fieldLabel: 'Select Default',
                xtype: 'rallyreleasecombobox',
                readyEvent: 'ready'
            }            
            ];
        return settings;
    },

    launch: function() {
        var me = this;

        Rally.data.ModelFactory.getModel({
            type: 'HierarchicalRequirement',
            success: function(model){
                me.model = model;
                me.addPickers();
            },
            scope: me
        });
    },
      
    addPickers: function(){
        var me = this;

        me.getSelectorBox().removeAll();

        me.getSelectorBox().add({
            xtype: 'rallyartifactsearchcombobox',
            width: 500,
            labelWidth: 100,
            fieldLabel: "Portfolio Item",
            labelAlign: 'right',
            remoteFilter: true,
            storeConfig: {
                pageSize: 200,
                models: [me.getSetting('selectorType')],
                context: {project: null}
            }
        });

        me.getSelectorBox().add({
                xtype: 'rallybutton',
                text: 'Update',
                margin: '0 10 0 10',
                listeners: {
                    click: this.updateView,
                    scope: this
                }
            });

        me.getSelectorBox().add({
                xtype: 'textfield',
                itemId:'userStoryName',
                name: 'name',
                fieldLabel: 'User Story Name',
                width:400,
                allowBlank: false  // requires a non-empty value
        });


        me.getSelectorBox().add({
            xtype: 'rallybutton',
            text: 'Create Story',
            margin: '0 10 0 10',
            cls: 'primary',
            listeners: {
                click: me._createUserStories,
                scope: me
            }
        });

    },
    getSelectorBox: function(){
        return this.down('#selector_box');
    },
    getDisplayBox: function(){
        return this.down('#display_box');
    },
    getPortfolioItem: function(){
        return this.down('rallyartifactsearchcombobox') && this.down('rallyartifactsearchcombobox').getRecord() || null;
    },
    showErrorNotification: function(msg){
        this.setLoading(false);
        Rally.ui.notify.Notifier.showError({message: msg});
    },
    getScopedStateId: function (suffix) {
        return this.getContext().getScopedStateId(this.getStateId(suffix));
    },    
    showMsg: function(msg){

        if (!msg){
            msg = 'No data found for the selected item.';
        }

        this.getDisplayBox().add({
            xtype: 'container',
            html: '<div class="no-data-container"><div class="secondary-message">' + msg + '</div></div>'
        });
    },


    _createUserStories: function(){
        //Create a US record, specifying initial values in the constructor
        var me = this;
        console.log('Release>>',me.getSetting('defaultRelease'))
        var userSotryRec = {
            Name: me.down('#userStoryName').value,
            ScheduleState:'Defined',
            Project:me.getContext().get('project'),
            Release:me.getSetting('defaultRelease'),
            Owner:me.getContext().get('user'),
        }

        var record = Ext.create(me.model, userSotryRec);

        record.save({
            callback: function(result, operation) {
                if(operation.wasSuccessful()) {
                    //Get the new stories formatted id
                    var formattedId = result.get('FormattedID');
                    //Display success msg
                    me.showMsg("User Story Created."+formattedId);
                    me.updateView();
                }
            },
            scope:me
        });

    },


    updateView: function(){
        var me = this;
        var pi = me.getPortfolioItem();
        me.logger.log('updateView', pi);
        if (!pi ){
            me.showMsg("Please select a portfolio item.");
            return;
        }

        Ext.create('Rally.data.wsapi.Store', {
            model: 'PortfolioItem/Feature',
            autoLoad: true,
            filters: [
                {
                    property: 'Parent',
                    value: pi.get('_ref')
                }
            ],
            listeners: {
                load: me._onTeamMembersLoaded,
                scope: me
            }
        });

    },

    _onTeamMembersLoaded: function(store, records) {
        var columns = [
            {
                value: null,
                columnHeaderConfig: {
                    headerData: {Feature: 'No Feature'}
                }
            }
        ];

        _.each(records, function(record) {
            columns.push({
                value: record.getRef().getRelativeUri(),
                columnHeaderConfig: {
                    headerData: {Feature: record.get('_refObjectName')}
                }
            });
        });

        this._addBoard(columns);
    },

    _addBoard: function(columns) {
        var me = this;

        me.getDisplayBox().removeAll();

        me.getDisplayBox().add({
            xtype: 'rallycardboard',
            types: ['User Story'],
            attribute: 'Feature',
            plugins: [
                //{ptype: 'rallycardboardprinting', pluginId: 'print'},
                //'rallygridboardaddnew',
                // {
                //     ptype: 'rallygridboardfieldpicker',
                //     headerPosition: 'left',
                //     modelNames: ['HierarchicalRequirement'],
                //     stateful: true,
                //     stateId: context.getScopedStateId('columns-example')
                // },
                {
                    ptype: 'rallyscrollablecardboard',
                    containerEl: this.getEl()
                }           
                // ,
                // {ptype: 'rallyfixedheadercardboard'}
            ],
            cardConfig: {
                editable: true,
                showIconMenus: true,
                //showAge: this.getSetting('showCardAge') ? this.getSetting('cardAgeThreshold') : -1,
                showBlockedReason: true
            },
            rowConfig: {
                field: 'Release',
                enableCrossRowDragging:true
            },            
            storeConfig: {
                context: this.getContext().getDataContext()
            },                     
            context: me.getContext(),
            columnConfig: {
                columnHeaderConfig: {
                    headerTpl: '{Feature}'
                }
            },
            columns: columns
        });
    },

    _loadWsapiRecords: function(config){
        var deferred = Ext.create('Deft.Deferred');
        var me = this;
        var default_config = {
            model: 'Defect',
            fetch: ['ObjectID']
        };
        this.logger.log("Starting load:",config.model);
        Ext.create('Rally.data.wsapi.Store', Ext.Object.merge(default_config,config)).load({
            callback : function(records, operation, successful) {
                if (successful){
                    deferred.resolve(records);
                } else {
                    me.logger.log("Failed: ", operation);
                    deferred.reject('Problem loading: ' + operation.error.errors.join('. '));
                }
            }
        });
        return deferred.promise;
    },

    _loadAStoreWithAPromise: function(model_name, model_fields){
        var deferred = Ext.create('Deft.Deferred');
        var me = this;
        this.logger.log("Starting load:",model_name,model_fields);
          
        Ext.create('Rally.data.wsapi.Store', {
            model: model_name,
            fetch: model_fields
        }).load({
            callback : function(records, operation, successful) {
                if (successful){
                    deferred.resolve(this);
                } else {
                    me.logger.log("Failed: ", operation);
                    deferred.reject('Problem loading: ' + operation.error.errors.join('. '));
                }
            }
        });
        return deferred.promise;
    },
    
    _displayGrid: function(store,field_names){
        this.down('#display_box').add({
            xtype: 'rallygrid',
            store: store,
            columnCfgs: field_names
        });
    },
    
    getOptions: function() {
        return [
            {
                text: 'About...',
                handler: this._launchInfo,
                scope: this
            }
        ];
    },
    
    _launchInfo: function() {
        if ( this.about_dialog ) { this.about_dialog.destroy(); }
        this.about_dialog = Ext.create('Rally.technicalservices.InfoLink',{});
    },
    
    isExternal: function(){
        return typeof(this.getAppId()) == 'undefined';
    },
    //onSettingsUpdate:  Override
    onSettingsUpdate: function (settings){
        this.logger.log('onSettingsUpdate',settings);
        // Ext.apply(this, settings);
        this.launch();
    }    
    
});
