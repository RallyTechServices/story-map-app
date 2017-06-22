Ext.define('CATS.utils.CardboardPrint',{
    // singleton: true,
    // print: function(cardboard){
    //   console.log('columns', cardboard.getColumns());
    //   console.log('rows', cardboard.getRows());
    //   console.log('cards', cardboard.getCards());
    //
    // }
    //     extend: 'Ext.Window',
      //  logger: new Rally.technicalservices.Logger(),
        truncateText: '...',
        title: 'Print Story Map',
        cardboard: null,
        styleSheetTitle: "printStoryMap",
        currentDocument: null,
        logger: null,
        /**
         *  Array of the following:
         *  dataIndex
         *  maxLength (default 0)
         *  cls (defaults are: card-title, content,
         */
        displayFields: ['FormattedID','Name'],

        constructor: function(config){
           this.title = config.title || this.title;
           this.cardboard = config.cardboard;
           this.logger = config.logger;
           this.currentDocument = config.currentDocument;
           this.displayFields = config.displayFields || this.displayFields;
           this.portfolioItem = config.portfolioItem;
        },
        show: function(){
            var options = "toolbar=1,menubar=1,scrollbars=yes,scrolling=yes,resizable=yes,width=1000,height=500";
            this.win = window.open('',this.title);

          //  var html = this._buildCardsHTML();
            this.win.document.write('<html><head><title>' + this.title + '</title>');
            this.win.document.write('<style>');
            this.win.document.write(this._getStyleSheet(this.styleSheetTitle));
            this.win.document.write('</style>');
            this.win.document.write('</head><body class="landscape">');
            //this.win.document.write(html);
            this.win.document.write('</body></html>');


        },

        print: function() {
          this.logger.log('print', this.win);
          if ( !this.win ) {
            this.show();
          }
          this.win.document.body.innerHTML = this._buildCardsHTML();

        },
        _getFeatureRenderer: function(record){

          var vals = [];
          this.logger.log('_getFeatureRenderer', record.getData(), this.displayFields);
          Ext.Array.each(this.displayFields, function(d){
            var val = record.get(d);
            if (val){
              vals.push(val);
            }
          });
          return vals.join('<br>');
        },
        _getStoryRecords: function(rows, columns, rowIdx, colIdx){
            var col = columns[colIdx],
                row = rows[rowIdx],
                release = rows[rowIdx] && rows[rowIdx].value && rows[rowIdx].value.Name || 0;

                var records = [];
                col.getStore().each(function(rec){
                  if (rec.get('Release') && rec.get('Release').Name === release){
                     records.push(rec);
                  }
                  if (release === 0 && !rec.get('Release')){
                    records.push(rec);
                  }
                });
                return records;
        },
        _getStoryCard: function(record){
            var vals = [record.get('FormattedID') + ": " + record.get('Name')];
            this.logger.log('_getStoryCard', record.getData(), this.displayFields);
            Ext.Array.each(this.displayFields, function(d){
              if (d !== "Name" && d !== "FormattedID"){
                var val = record.get(d);
                if (val){
                  if (Ext.isObject(val)){
                    if (val._refObjectName){
                       val = val._refObjectName;
                    } else if (val._tagsNameArray && val._tagsNameArray.length > 0){
                        val = _.pluck(val._tagsNameArray, 'Name').join(', ')
                    } else if (val.Count >= 0){
                       val = val.Count;
                    }
                  }
                  var fieldName = record.getField(d).displayName;
                  vals.push(fieldName + ": " + val);
                }
              }

            });
            this.logger.log('_getStoryCard vals', vals);
            return vals.join('<br>');
        },
        _getStoryRenderer: function(records, cardColumns){
            if (!records || records.length === 0){
               return Ext.String.format('<td colspan="{0}"></td>',cardColumns);
            }

            var html = "<td><table width=\"100%\">",
                colIdx = 0,
                width = 100/cardColumns;

            Ext.Array.each(records, function(r){
               colIdx++;
               if (colIdx === 1){
                 html += '<tr>';
               }
               html += Ext.String.format('<td class="story-cell" width="{1}%">{0}</td>', this._getStoryCard(r), width);
               if (colIdx === cardColumns){
                  html += "</tr>";
                  colIdx = 0;
               }
            }, this);

            if (colIdx > 0 && colIdx < cardColumns){
              for (var i=colIdx; i < cardColumns; i++){
                html += '<td class="empty-cell" width="{1}%"></td>'
              }
              html += '</tr>';
            }

            html += "</table></td>";
            return html;

        },
        _getReleaseRenderer: function(recordData){
          return recordData && recordData.Name || "No Release";
        },
        _buildCardsHTML: function() {

            this.logger.log('cardboard', this.cardboard);
              this.logger.log('columns', this.cardboard.getColumns());
              this.logger.log('rows', this.cardboard.getRows());
              this.logger.log('cards', this.cardboard.getCards());

              var colCount = this.cardboard.getColumns().length,
                  rowCount = this.cardboard.getRows().length;

              var colWidth = 100/colCount;
              this.logger.log('columnWidth', colWidth);
              var columns = this.cardboard.getColumns();
              var html = Ext.String.format("<h1 class=\"initiative-title\">{0}: {1}</h1>",this.portfolioItem.get('FormattedID'), this.portfolioItem.get('Name'));

              html += '<table style="width:100%"><thead>';

              var multiColumns = false,
                  storyColCount = 1;
              if (multiColumns){
                storyColCount = Math.floor(8/colCount);
              }

              for (var i=0; i<colCount; i++){
                var val = this._getFeatureRenderer(columns[i].record);
                html += Ext.String.format('<th class="feature-cell" style="width:' + colWidth + '%">{0}</td>', val);
              }
              html += '</thead>';
              this.logger.log('html', html);

              var rows = this.cardboard.getRows();
              for (var i=0; i<rowCount; i++){
                 //insert divider row here
                 var relRecord = rows[i].value;
                 html += Ext.String.format('<tr><td colspan="' + colCount + '" class="release-cell">{0}</td></tr>', this._getReleaseRenderer(relRecord));
                 html+= '<tr>';
                 for (var j=0; j<colCount; j++){
                    var records = this._getStoryRecords(rows, columns, i, j);
                    html += this._getStoryRenderer(records, storyColCount);
                 }
                 html += '</tr>';
              }

              html += '</table>';
              this.logger.log('html', html);
              return html;
        },

        _getStyleSheet: function(styleSheetTitle) {
            this.logger.log('getStyleSheet');
            var styleSheet;
            // var docs = Ext.getDoc();
            var elems = this.currentDocument.query('style');

            for (var i=0; i< elems.length; i++){
                if (elems[i].title == styleSheetTitle){
                    styleSheet = elems[i];
                }
            }
            return styleSheet.innerHTML;
        }
});
