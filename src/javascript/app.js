Ext.define("StoryMapApp", {
    extend: 'Rally.app.App',
    settingsScope: 'workspace',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    defaults: { margin: 10 },
    items: [
        {xtype:'container',itemId:'print_box',layout:{type:'hbox'}, width: '100pct' },
        {xtype:'container',itemId:'selector_box',layout:{type:'hbox'}, width: '100pct' },
        {xtype:'container',itemId:'display_box', layout: { type:'fit' } }
    ],

    integrationHeaders : {
        name : "StoryMapApp"
    },

    config: {
        defaultSettings: {
            piLevelType: 'UserStory'
        }
    },

    getSettingsFields: function() {
        var me = this;

        var piLevelType = this.getPILevelType();

        var typeFilters = [{property: 'TypePath', operator: 'contains', value: 'PortfolioItem/'}];
        var settings = [];
        if ( !Ext.isEmpty(me.thirdLevelPI)) {
            settings.push({
                xtype      : 'fieldcontainer',
                fieldLabel : 'Artifact to Map',
                defaultType: 'radiofield',
                stateful: true,
                stateId:'radiofield_xx',
                width: 300,
                defaults: {
                    flex: 1
                },
                layout: 'vbox',
                items: [
                    {
                        boxLabel  : me.secondLevelPI,
                        name      : 'piLevelType',
                        inputValue: me.secondLevelPI,
                        id        : 'radio1',
                        checked: me.secondLevelPI && piLevelType === me.secondLevelPI
                    }, {
                        boxLabel  : 'User Story',
                        name      : 'piLevelType',
                        inputValue: 'UserStory',
                        id        : 'radio2',
                        checked: piLevelType === 'UserStory'
                    }
                ]
            });
        }

        var models_for_columns = ['HierarchicalRequirement'];
        if ( !Ext.isEmpty(me.thirdLevelPI)) {
            models_for_columns.push('PortfolioItem');
        }

        settings.push({
            xtype: 'rallyfieldpicker',
            name: 'columnNames',
            autoExpand: true,
            label: 'Display Fields on Cards',
            modelTypes: models_for_columns,
            alwaysSelectedValues: ['FormattedID','Name'],
            fieldBlackList: ['Attachments','Children']
        });
        return settings;
    },

    getPILevelType : function(){
        return this.getSetting('piLevelType') ? this.getSetting('piLevelType') : 'UserStory' ;
    },

    launch: function() {
        var me = this;

        me.selectedPiLevelType = this.getPILevelType();

        me._getPITypes().then({
            success: function(results){
                Ext.Array.each(results, function(pi){
                    if(pi.get('Ordinal')==0){
                        me.featurePI = pi.get('TypePath');
                    }
                    if(pi.get('Ordinal')==1){
                        me.secondLevelPI = pi.get('TypePath');
                    }
                    if(pi.get('Ordinal')==2){
                        me.thirdLevelPI = pi.get('TypePath');
                    }
                    if(pi.get('Ordinal')==3){
                        me.fourthLevelPI = pi.get('TypePath');
                    }
                });

                var promises = [
                    function(){ return me._getModel('HierarchicalRequirement'); },
                    function(){ return me._getModel(me.featurePI); },
                    function(){ return me._getReleases(); },
                    function(){ return me._getModel(me.secondLevelPI); },
                    function(){ return me._getModel(me.thirdLevelPI); }
                ];

                Deft.Chain.sequence(promises,me).then({
                    scope: me,
                    success: function(results) {
                        me.storyModel = results[0];
                        var scheduleStateField = results[0].getField('ScheduleState');
                        scheduleStateField.getAllowedValueStore().load({
                            fetch: ['StringValue'],
                            callback: function(allowedValues, operation, success){
                                if (success){
                                    var values = _.map(allowedValues, function(av){return av.get('StringValue')});
                                    var i = 0;
                                    me.logger.log('AllowedValues ', values);
                                    me.scheduleStateFieldInitialValue = values[0] == "" ?  values[1]:values[0];

                                } else {
                                    var msg = 'Error retrieving allowed values for ScheduleState' + operation.error.errors[0];
                                    Rally.ui.notify.Notifier.showError({message: msg});
                                }
                            },
                            scope: me
                        });


                        me.featureModel = results[1];
                        var stateField = results[1].getField('State');
                        stateField.getAllowedValueStore().load({
                            fetch: ['StringValue'],
                            callback: function(allowedValues, operation, success){
                                if (success){
                                    var values = _.map(allowedValues, function(av){return av.get('_ref')});
                                    var i = 0;
                                    me.logger.log('AllowedValues ', values);
                                    me.stateFieldInitialValue = values[0] == "null" ?  values[1]:values[0];

                                } else {
                                    var msg = 'Error retrieving allowed values for State' + operation.error.errors[0];
                                    Rally.ui.notify.Notifier.showError({message: msg});
                                }
                            },
                            scope: me
                        });

                        me.releases = results[2];
                        me.secondLevelPIModel = results[3];
                        if ( Ext.isEmpty(me.secondLevelPIModel) ) {
                            Rallly.ui.notify.Notifier.showError({message: "This app requires at least two Portfolio Item levels"});
                            return;
                        }
                        var secondLevelStateField = results[3].getField('State');
                        secondLevelStateField.getAllowedValueStore().load({
                            fetch: ['StringValue'],
                            callback: function(allowedValues, operation, success){
                                if (success){
                                    var values = _.map(allowedValues, function(av){return av.get('_ref')});
                                    var i = 0;
                                    me.logger.log('AllowedValues ', values);
                                    me.secondLevelStateFieldInitialValue = values[0] == "null" ?  values[1]:values[0];

                                } else {
                                    var msg = 'Error retrieving allowed values for State' + operation.error.errors[0];
                                    Rally.ui.notify.Notifier.showError({message: msg});
                                }
                            },
                            scope: me
                        });

                        me.thirdLevelPIModel = results[4];
                        if ( !Ext.isEmpty(me.thirdLevelPIModel)) {
                        var thirdLevelStateField = results[4].getField('State');
                            thirdLevelStateField.getAllowedValueStore().load({
                                fetch: ['StringValue'],
                                callback: function(allowedValues, operation, success){
                                    if (success){
                                        var values = _.map(allowedValues, function(av){return av.get('_ref')});
                                        var i = 0;
                                        me.logger.log('AllowedValues ', values);
                                        me.thirdLevelStateFieldInitialValue = values[0] == "null" ?  values[1]:values[0];

                                    } else {
                                        var msg = 'Error retrieving allowed values for State' + operation.error.errors[0];
                                        Rally.ui.notify.Notifier.showError({message: msg});
                                    }
                                },
                                scope: me
                            });
                        }
                        me.addPickers(me.selectedPiLevelType);
                    },
                    failure: function(error_message){
                        alert(error_message);
                    }
                }).always(function() {
                    me.setLoading(false);
                });
            }
        });


    },

    _getPITypes: function() {
        var deferred = Ext.create('Deft.Deferred');
        Ext.create('Rally.data.wsapi.Store',{
            autoLoad: true,
            model: 'TypeDefinition',
            sorters: [{property:'Ordinal', direction: 'DESC'}],
            filters: [{property: 'TypePath', operator: 'contains', value: 'PortfolioItem/'}],
            fetch: ['DisplayName', 'ElementName', 'TypePath', 'Parent', 'UserListable','Ordinal','Name'],
            listeners: {
                load: function(store, records) {
                    deferred.resolve(records);
                }
            }
        });

        return deferred.promise;
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
                    //deferred.reject('Problem loading: ' + operation.error.errors.join('. '));
                }
            }
        });
        return deferred.promise;
    },

    _getModel: function(modelType){
        var deferred = Ext.create('Deft.Deferred');
        this.logger.log("Getting model for ", modelType);
        var me = this;
        if ( Ext.isEmpty(modelType) ) { return null; }

        Rally.data.ModelFactory.getModel({
            type: modelType, //'HierarchicalRequirement',
            success: function(model){
                deferred.resolve(model);
            },
            scope: me
        });

        return deferred.promise;
    },
    _printBoard: function(){

        var cardboard = this.down('rallycardboard');
        if (!cardboard){
          return;
        }

        var fields = this._getAlwaysSelectedFields() || ['FormattedID','Name'];
        this.logger.log('_printBoard', fields);

        var win = Ext.create('CATS.utils.CardboardPrint',{
            cardboard: cardboard,
            displayFields: fields,
            currentDocument: Ext.getDoc(),
            logger: this.logger,
            portfolioItem: this.getPortfolioItem()
        });

        win.show();
        win.print();
    },
    addPickers: function(){
        var me = this;
        var piType = me.selectedPiLevelType == 'UserStory' ? me.featurePI : me.thirdLevelPI
        var releaseNames = [];
        var releaseCombo = [];

        Ext.Array.each(me.releases, function(rel){
            if (!Ext.Array.contains(releaseNames, rel.get('_refObjectName'))){
                releaseNames.push(rel.get('_refObjectName'));
                releaseCombo.push({_refObjectName: rel.get('_refObjectName'), _ref: rel.get('_refObjectName')});
            }
        });

        me.getPrintBox().removeAll();

        var fp = me.getPrintBox().add({
          xtype: 'fieldpickerbutton',
            modelNames: ['HierarchicalRequirement'],
            context: this.getContext(),
            margin: '10 5 10 5',
            stateful: true,
            stateId: 'board-columns'
        });
        fp.on('fieldsupdated', this._updateView, this);

        me.getPrintBox().add({
          xtype:'rallybutton',
          iconCls: 'icon-print',
          cls: 'secondary rly-small',
            margin: '10 5 10 5',
          listeners: {
            click: this._printBoard,
            scope: this
          }
        });

        me.getSelectorBox().removeAll();

        me.getSelectorBox().add({xtype:'panel',itemId:'row_1', bodyPadding: 5,  width: '50%', height: 150, title: 'Display Board'},
                                {xtype:'panel',itemId:'row_2', bodyPadding: 5,  width: '50%', height: 150, title: 'Create ' + piType});

        me.getContainer('#row_1').add({
            xtype: 'rallyartifactsearchcombobox',
            width: 300,
            margin: '10 10 10 10',
            fieldLabel: "Portfolio Item",
            labelAlign: 'right',
            remoteFilter: true,
            emptyText: "Type ID or Keyword to Search...",
            stateful: true,
            stateId: "story-map-app-selected-portfolio",
            storeConfig: {
                pageSize: 2000,
                models: me.selectedPiLevelType == 'UserStory' ? [me.secondLevelPI] :[me.fourthLevelPI],
                context: {project: null}
            },
            listeners: {
              stateloaded: this._updateView,
              beforestatesave:function(me, state){

                if (state && state.value === null){
                  return false;
                }
              },
              scope: this
            }
        });

        if(me.selectedPiLevelType == 'UserStory'){
            me.getContainer('#row_1').add({
                xtype:'rallycombobox',
                fieldLabel: 'Releases',
                itemId: 'cbReleases',
                margin: '10 10 10 10',
                width: 300,
                labelAlign: 'right',
                stateful: true,
                stateId: "story-map-app-releases",
                store: Ext.create('Rally.data.custom.Store',{
                    data: releaseCombo,
                    fields: ['_refObjectName','_ref'],
                    pageSize:2000
                }),
                multiSelect: true
            });
        }

        me.getContainer('#row_1').add({
                xtype: 'rallybutton',
                text: 'Update',
                margin: '10 10 10 10',
                defaultAlign: 'right',
                listeners: {
                    click: this._updateView,
                    scope: this
                }
            });

        me.getContainer('#row_2').add({
                xtype: 'textfield',
                itemId:'featureName',
                name: 'featureName',
                fieldLabel: piType.replace('PortfolioItem/','') + ' Name',
                margin: '10 10 10 10',
                width:300,
                allowBlank: false  // requires a non-empty value
        });

        me.getContainer('#row_2').add({
            xtype: 'rallybutton',
            text: 'Create ' + piType.replace('PortfolioItem/',''),
            margin: '10 10 10 10',
            cls: 'primary',
            listeners: {
                click: me._createFeatures,
                scope: me
            }
        });

    },
    getSelectorBox: function(){
        return this.down('#selector_box');
    },
    getPrintBox: function(){
        return this.down('#print_box');
    },
    getContainer: function(name){
        return this.down(name);
    },

    getDisplayBox: function(){
        return this.down('#display_box');
    },
    getPortfolioItem: function(){
        this.logger.log('getPortfolioItem', this.down('rallyartifactsearchcombobox').getValue());
        var val = this.down('rallyartifactsearchcombobox') && this.down('rallyartifactsearchcombobox').getValue(),
            rec = this.down('rallyartifactsearchcombobox') && this.down('rallyartifactsearchcombobox').getRecord() || null;

            this.logger.log('getPortfolioItem', val, this.down('rallyartifactsearchcombobox').getStore());
        if (val && rec === null){
            this.down('rallyartifactsearchcombobox').getStore().each(function(r){
              if (r.get('_ref') === val){
                 rec = r;
              }
            });
           this.logger.log('rec', rec);
        }
        return rec;

    },
    showErrorNotification: function(msg){
        this.setLoading(false);
        Rally.ui.notify.Notifier.showError({message: msg});
    },
    getScopedStateId: function (suffix) {
        return this.getContext().getScopedStateId(this.getStateId(suffix));
    },
    showMsg: function(msg){
        this.getDisplayBox().removeAll();
        if (!msg){
            msg = 'No data found for the selected item.';
        }

        this.getDisplayBox().add({
            xtype: 'container',
            html: '<div class="no-data-container"><div class="secondary-message">' + msg + '</div></div>'
        });
    },


    _updateView: function(fields){
       this.logger.log('_updateView', fields);

        var me = this;
        var pi = me.getPortfolioItem();

        me.logger.log('_updateView', pi);

        var releases = this.down('#cbReleases') && this.down('#cbReleases').getValue() || [];

        if (!pi || pi.get('ObjectID') === null || (releases.length < 1 && 'UserStory' == me.selectedPiLevelType)){
            me.showMsg("Please select a portfolio item and releases");
            return;
        }


        if (!pi ){
            me.showMsg("Please select a portfolio item.");
            return;
        }

        me.setLoading("Loading...");

        Ext.create('Rally.data.wsapi.Store', {
            model: me.selectedPiLevelType == 'UserStory' ? me.featurePI : me.thirdLevelPI,//me.featurePI,
            autoLoad: true,
            fetch: ['Name','FormattedID'],
            context: {
                projectScopeUp: false,
                projectScopeDown: true
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

        if(records.length < 1){
            me.showMsg("No records for selected crieria");
            me.setLoading(false);
            return;
        }
        var columns = [];

        //TODO
        //var type = me.selectedPiLevelType == 'UserStory' ? 'Feature' : 'PortfolioItem';//me.featurePI,
        _.each(records, function(record){
            var headerData = {};

            if(me.selectedPiLevelType == 'UserStory'){
              headerData = {Feature: Ext.create('Rally.ui.renderer.template.FormattedIDTemplate',{}).apply(record.data) + ': ' + record.get('_refObjectName') }; //+ '  ' +  me._getAddStoryButton(record)},
            } else {
              headerData = {Parent: Ext.create('Rally.ui.renderer.template.FormattedIDTemplate',{}).apply(record.data) + ': ' + record.get('_refObjectName') };
            }

            columns.push({
              value: record.getRef().getRelativeUri(),
              record: record,
              columnHeaderConfig: {
                  headerData: headerData,
                  listeners: {
                    boxready: function(header){
                      this._updateColumnHeaderData(header, record, true);
                    },
                    scope: this
                  }
              }
            });
        }, this);
        me._addBoard(columns);
    },

    _updateColumnHeaderData: function(columnHeader, record, expanded){

      if (columnHeader.down('#addButton')){
        columnHeader.down('#addButton').destroy();
      }

      if (expanded){
        var selectedPIType = this.selectedPiLevelType,
            buttonLabel = selectedPIType == 'UserStory' ? 'Add Story' : 'Add '+ this.secondLevelPI.replace('PortfolioItem/','');

        columnHeader.down('#headerTitle').add({
            xtype: 'rallybutton',
            itemId: 'addButton',
            text: buttonLabel,
            scope: this,
            cls: 'request-button',
            handler: function () {
                this._createStoryDialog(record);
            }
          });
      }

    },
    _createStoryDialog: function(record){

        var me = this;
        if (me.dialog){me.dialog.destroy();}
        var type = me.selectedPiLevelType == 'UserStory' ? 'User Story' : me.secondLevelPI.replace('PortfolioItem/','');
        var dTitle = 'Create a New '+ type + ' for ' + record.get('Name');

        me.dialog = Ext.create('Rally.ui.dialog.Dialog',{
            defaults: { padding: 5, margin: 20 },
            closable: true,
            draggable: true,
            title: dTitle,
            listeners: {
              render: function(dlg){
                  dlg.down('#userStoryName').focus();
              }
            },
            items: [
                    {
                      xtype: 'textfield',
                      itemId:'userStoryName',
                      name: 'userStoryName',
                      fieldLabel: type + ' Name',
                      margin: '10 10 10 10',
                      width:400,
                      listeners: {
                          afterrender: function(field) {
                            Ext.defer(function() {
                                field.focus(true, 100);
                            }, 1);
                        }
                      },
                      allowBlank: false  // requires a non-empty value
                    },
                    {
                        xtype: 'rallybutton',
                        text: 'Create ' + type,
                        margin: '10 10 10 10',
                        cls: 'primary',
                        listeners: {
                            click: function(){
                                return me._createUserStories(record);
                            },
                            scope: me
                        }
                    }]
        });
        me.dialog.show();
    },

    _createUserStories: function(record){
        //Create a US record, specifying initial values in the constructor
        var me = this;
        var userStoryRec = {
            Name: me.dialog ? me.dialog.down('#userStoryName').value:'',
            ScheduleState: me.scheduleStateFieldInitialValue,
            Project:me.getContext().get('project'),
            Owner:me.getContext().get('user')
        }

        if(me.selectedPiLevelType == 'UserStory'){
            userStoryRec['ScheduleState'] = me.scheduleStateFieldInitialValue;
            userStoryRec['PortfolioItem'] = record.get('_ref');
        }else{
            userStoryRec['State'] = me.secondLevelStateFieldInitialValue;
            userStoryRec['Parent'] = record.get('_ref');
        }

        var record = me.selectedPiLevelType == 'UserStory' ? Ext.create(me.storyModel, userStoryRec) : Ext.create(me.secondLevelPIModel, userStoryRec);

        record.save({
            params: {rankTo: 'BOTTOM'},
            callback: function(result, operation) {
                if(operation.wasSuccessful()) {
                    //Get the new stories formatted id
                    var formattedId = result.get('FormattedID');
                    //Display success msg
                    me.showMsg(me.selectedPiLevelType + " Created."+formattedId);
                    if(me.dialog) {me.dialog.destroy();}
                    me._updateView();
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
            Parent: pi.get('_ref'),
            State: me.selectedPiLevelType == 'UserStory' ? me.stateFieldInitialValue : me.thirdLevelStateFieldInitialValue
        }

        var record = me.selectedPiLevelType == 'UserStory' ? Ext.create(me.featureModel, featureRec) : Ext.create(me.thirdLevelPIModel, featureRec);

        record.save({
            callback: function(result, operation) {
                if(operation.wasSuccessful()) {
                    //Get the new stories formatted id
                    var formattedId = result.get('FormattedID');
                    //Display success msg
                    me.showMsg("PI Created."+formattedId);
                    me._updateView();
                }
            },
            scope:me
        });

    },

    _addBoard: function(columns) {
        var me = this;

        me.getDisplayBox().removeAll();
        this.logger.log('_addBoard', me.getDisplayBox().getWidth(), me.getWidth());
        var releases = this.down('#cbReleases') && this.down('#cbReleases').getValue() || [];

        var releaseFilters = [{property:'Release',value:null}];

        var rowReleaseRecords = [];

        this.logger.log('addBoard', me._getAlwaysSelectedFields());
        var storeConfig = {
                context: this.getContext().getDataContext(),
                fetch: me._getAlwaysSelectedFields(),
                context: {
                    projectScopeUp: false,
                    projectScopeDown: true
                },
                limit: 'Infinity'
            }

        if(0 < releases.length){
            Ext.Array.each(releases, function(rel){
                releaseFilters.push({property:'Release.Name',value:rel});
            });
            storeConfig['filters'] = Rally.data.wsapi.Filter.or(releaseFilters);

            Ext.Array.each( me.releases, function(record) {
                if(Ext.Array.contains(releases, record.get('Name'))){
                    rowReleaseRecords.push(record.getData());
                }
            });
        }else{
            rowReleaseRecords.push(null);
        }

        var width = this.getSelectorBox().getWidth();
        this.getDisplayBox().getEl().on('afterupdate', function(){console.log('yoyoyo');});

        var cardBoardConfig = {
            xtype: 'rallycardboard',
            itemId: 'storyCardBoard',
            types: me.selectedPiLevelType == 'UserStory' ? ['HierarchicalRequirement']:[me.secondLevelPI ],
            attribute: me.selectedPiLevelType == 'UserStory' ? 'PortfolioItem' : 'Parent',
            width: width,
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
            storeConfig: storeConfig,
            context: me.getContext(),
            columnConfig: {
                columnHeaderConfig: {
                    headerTpl: me.selectedPiLevelType == 'UserStory' ? '{Feature}' : '{Parent}'
                },
                plugins: [{
                    ptype: 'rallycardboardcollapsiblecolumns2'
                }]
            },

            loadMask: 'Loading!',
            columns: columns,
            listeners: {
              scope: this,
              resize: function(d,width,height,oldWidth,oldHeight){
                 this.logger.log('resize', width, height, oldWidth, oldHeight);
              },
              columnvisibilitychanged: function(collapsiblePlugin){
                //this.getWidth for Ashish is much smaller than mine and the grid appears to be wider than this.getWidth().  Which is causing
                //a squishly looking board.
                if (!collapsiblePlugin || !collapsiblePlugin.getCmp || !collapsiblePlugin.column){ return; }

                var cardboard = collapsiblePlugin.getCmp().ownerCardboard;
                var plugin = cardboard.findPlugin('rallyscrollablecardboard');
                if(plugin.getScrollableColumns().length === 0){
                    this.logger.log('no scrollable columns');
                    return;
                }


                // assuming that the selector boxes don't change size!
                var comparison_width = this.ownerCt.getWidth() - 20;

                //this.logger.log('cardboard/app', cardboard.getWidth(), comparison_width, cardboard.getEl().getWidth());
                while(cardboard.getWidth() && cardboard.getWidth() > comparison_width && cardboard.getVisibleColumns().length > 1){
                    this.logger.log('clearing a column');
                    cardboard.hideColumn(plugin.getLastVisibleScrollableColumn());
                }
                plugin._addScrollButtons();

// sometimes, the refresh from the columns pushes the page to the right but it
// doesn't fire an event!  So let's stay quiet a moment and then check the size again
                function sleep (time) {
                    return new Promise((resolve) => setTimeout(resolve, time));
                }

                sleep(1000).then(() => {
                    while(cardboard.getWidth() && cardboard.getWidth() > comparison_width && cardboard.getVisibleColumns().length > 1){
                        cardboard.hideColumn(plugin.getLastVisibleScrollableColumn());
                        plugin._addScrollButtons();
                    }
                });
                //var record = collapsiblePlugin.column && collapsiblePlugin.column.record,
                 //   columnHeader = collapsiblePlugin.getCmp().getColumnHeader();
                //this._updateColumnHeaderData(columnHeader, record, collapsiblePlugin.columnExpanded) ;

              }
            }
        };

        if(me.selectedPiLevelType == 'UserStory'){
            cardBoardConfig['rowConfig'] = {
                field: 'Release',
                values: rowReleaseRecords,
                enableCrossRowDragging: true
            };
        }

        if (!me.rendered){
           me.on('render', function(){
               me.getDisplayBox().add(cardBoardConfig);
           }, this);
        } else {
          me.getDisplayBox().add(cardBoardConfig);

        }
        me.setLoading(false);
    },


    _getAlwaysSelectedFields: function() {
        var columns = this.getSetting('columnNames');
        var additionalColumns = [];
        if (this.down('fieldpickerbutton')){
           additionalColumns = this.down('fieldpickerbutton').getFields();
        }

        if ( Ext.isEmpty(columns) ) {
            return additionalColumns;
        }


        if ( Ext.isString(columns) ) {
            columns = columns.split(',');
        }

        return Ext.Array.unique( columns.concat(additionalColumns) );
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
