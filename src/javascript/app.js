Ext.define("TSApp", {
    extend: 'Rally.app.App',
    settingsScope: 'workspace',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    defaults: { margin: 10 },
    items: [
        {xtype:'container',itemId:'selector_box'},
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
                xtype: 'rallyfieldpicker',
                name: 'columnNames',
                autoExpand: true,
                modelTypes: ['HierarchicalRequirement'],
                alwaysSelectedValues: ['FormattedID','Name'],
                fieldBlackList: ['Attachments','Children']
            }            
            ];
        return settings;
    },

    launch: function() {
        var me = this;
        console.log('Lauching..');
        Deft.Promise.all([me._getModel('HierarchicalRequirement'),me._getModel('PortfolioItem/Feature'),me._getReleases()],me).then({
            scope: me,
            success: function(results) {
                me.storyModel = results[0];
                me.featureModel = results[1];
                me.releases = results[2];
                me.addPickers();
            },
            failure: function(error_message){
                alert(error_message);
            }
        }).always(function() {
            me.setLoading(false);
        });

        // Rally.data.ModelFactory.getModel({
        //     type: 'HierarchicalRequirement',
        //     success: function(model){
        //         me.storyModel = model;
        //         Rally.data.ModelFactory.getModel({
        //             type: 'PortfolioItem/Feature',
        //             success: function(model){
        //                 me.featureModel = model;
        //                 me.addPickers();
        //             },
        //             scope: me
        //         });
        //     },
        //     scope: me
        // });
    },
    
    _getReleases: function(){
        var deferred = Ext.create('Deft.Deferred');
        var me = this;
         
        Ext.create('Rally.data.wsapi.Store', {
            model: 'Release',
            fetch: ['Name','ObjectID','Project','ReleaseDate'],
            context: {
                projectScopeUp: false,
                projectScopeDown: false            
            },
            limit: 'Infinity',
            sorters: [{
                property: 'ReleaseDate',
                direction: 'DESC'
            }]
        }).load({
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

    _getModel: function(modelType){
        var deferred = Ext.create('Deft.Deferred');
        var me = this;

        Rally.data.ModelFactory.getModel({
            type: modelType, //'HierarchicalRequirement',
            success: function(model){
                deferred.resolve(model);
            },
            scope: me
        });

        return deferred.promise;
    },

    addPickers: function(){
        var me = this;

        me.getSelectorBox().removeAll();

        me.getSelectorBox().add({xtype:'container',itemId:'row_1', layout: {type: 'hbox'}},
                                {xtype:'container',itemId:'row_2',layout: {type: 'hbox'}});
        me.getContainer('#row_1').add({
            xtype: 'rallyartifactsearchcombobox',
            width: 300,
            margin: '10 10 10 10',
            fieldLabel: "Portfolio Item",
            labelAlign: 'right',
            remoteFilter: true,
            storeConfig: {
                pageSize: 300,
                models: [me.getSetting('selectorType')],
                context: {project: null}
            }
        });

        me.getContainer('#row_1').add({
            xtype:'rallycombobox',
            fieldLabel: 'Releases',
            itemId: 'cbReleases',
            margin: '10 10 10 10',
            width: 300,
            labelAlign: 'right',
            store: Ext.create('Rally.data.custom.Store',{
                data: _.map(me.releases, function(i){ return {_refObjectName: i.get('_refObjectName'), _ref: i.get('_ref')}; }),
                fields: ['_refObjectName','_ref']
            }),
            multiSelect: true
        });


        me.getContainer('#row_1').add({
                xtype: 'rallybutton',
                text: 'Update',
                margin: '10 10 10 10',
                listeners: {
                    click: this.updateView,
                    scope: this
                }
            });

        me.getContainer('#row_2').add({
                xtype: 'textfield',
                itemId:'featureName',
                name: 'featureName',
                fieldLabel: 'Feature Name',
                margin: '10 10 10 10',
                width:300,
                allowBlank: false  // requires a non-empty value
        });

        me.getContainer('#row_2').add({
            xtype: 'rallybutton',
            text: 'Create Feature',
            margin: '10 10 10 10',
            cls: 'primary',
            listeners: {
                click: me._createFeatures,
                scope: me
            }
        });

        me.getContainer('#row_2').add({
                xtype: 'textfield',
                itemId:'userStoryName',
                name: 'userStoryName',
                fieldLabel: 'User Story Name',
                margin: '10 10 10 10',
                width:300,
                allowBlank: false  // requires a non-empty value
        });

        me.getContainer('#row_2').add({
            xtype: 'rallybutton',
            text: 'Create Story',
            margin: '10 10 10 10',
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
    getContainer: function(name){
        return this.down(name);
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
        var userSotryRec = {
            Name: me.down('#userStoryName').value,
            ScheduleState:'Defined',
            Project:me.getContext().get('project'),
            Owner:me.getContext().get('user'),
        }

        var record = Ext.create(me.storyModel, userSotryRec);

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

    _createFeatures: function(){
        //Create a US record, specifying initial values in the constructor
        var me = this;
        var pi = me.getPortfolioItem();
        if (!pi ){
            me.showMsg("Please select a portfolio item.");
            return;
        }
        var featureRec = {
            Name: me.down('#featureName').value,
            Project:me.getContext().get('project'),
            Owner:me.getContext().get('user'),
            Parent: pi.get('_ref')
        }

        var record = Ext.create(me.featureModel, featureRec);

        record.save({
            callback: function(result, operation) {
                if(operation.wasSuccessful()) {
                    //Get the new stories formatted id
                    var formattedId = result.get('FormattedID');
                    //Display success msg
                    me.showMsg("Feature Created."+formattedId);
                    me.updateView();
                }
            },
            scope:me
        });

    },

    updateView: function(){
        var me = this;
        me.setLoading("Loading...");
        var pi = me.getPortfolioItem();
        me.logger.log('updateView', pi);
        if (!pi ){
            me.showMsg("Please select a portfolio item.");
            return;
        }

        Ext.create('Rally.data.wsapi.Store', {
            model: 'PortfolioItem/Feature',
            autoLoad: true,
            fetch: ['Name','FormattedID'],
            context: {
                projectScopeUp: false,
                projectScopeDown: false            
            },              
            filters: [
                {
                    property: 'Parent',
                    value: pi.get('_ref')
                }
            ],
            listeners: {
                load: me._getFeaturesAsColumns,
                scope: me
            }
        });

    },

    _getFeaturesAsColumns: function(store, records) {
        var me = this;
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
                    headerData: {Feature: Ext.create('Rally.ui.renderer.template.FormattedIDTemplate',{}).apply(record.data) + ': ' + record.get('_refObjectName')}
                }
            });
        });

        this._addBoard(columns);
    },

    _addBoard: function(columns) {
        var me = this;

        me.getDisplayBox().removeAll();

        var releases = this.down('#cbReleases').getValue() || [];

        var releaseFilters = [{property:'Release',value:null}];

        var storeConfig = {
                context: this.getContext().getDataContext(),
                fetch: me._getAlwaysSelectedFields(),
                context: {
                    projectScopeUp: false,
                    projectScopeDown: false            
                },
                limit: 'Infinity'
            }

        if(0 < releases.length){
            Ext.Array.each(releases, function(rel){
                releaseFilters.push({property:'Release',value:rel});
            });
            storeConfig['filters'] = Rally.data.wsapi.Filter.or(releaseFilters);           
        }

        var rowReleases = Ext.Array.map( me.releases, function(record) { return record.getData(); });

        me.getDisplayBox().add({
            xtype: 'rallycardboard',
            itemId: 'storyCardBoard',
            types: ['HierarchicalRequirement'],
            attribute: 'PortfolioItem',
            plugins: [
                {
                    ptype: 'rallyscrollablecardboard',
                    containerEl: this.getEl()
                }           
            ],
            cardConfig: {
                editable: true,
                showIconMenus: true,
                fields: me._getAlwaysSelectedFields(),
                //showAge: this.getSetting('showCardAge') ? this.getSetting('cardAgeThreshold') : -1,
                showBlockedReason: true
            },
            rowConfig: {
                field: 'Release',
                values: rowReleases,
                enableCrossRowDragging: true
            },            
            storeConfig: storeConfig,                     
            context: me.getContext(),
            columnConfig: {
                columnHeaderConfig: {
                    headerTpl: '{Feature}'
                }
            },
            loadMask: 'Loading!',
            columns: columns
        });
        me.setLoading(false);
    },

    _getAlwaysSelectedFields: function() {
        var columns = this.getSetting('columnNames') ;
                
        if ( Ext.isEmpty(columns) ) {
            return [];
        }
        
        if ( Ext.isString(columns) ) {
            return columns.split(',');
        }
        
        // console.log('_getAlwaysSelectedFields',columns);
        return Ext.Array.unique( columns );
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
