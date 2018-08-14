CTPS = {};
CTPS.adtApp = {};

CTPS.adtApp.CLICK_TOLERANCE = 10;

Ext.BLANK_IMAGE_URL = '../../libs/extjs/ext-3.4.0/resources/images/default/s.gif';


CTPS.adtApp.szServerRoot = 'http://www.ctps.org:8080/geoserver/'; 
CTPS.adtApp.szWMSserverRoot = CTPS.adtApp.szServerRoot + '/wms'; 
CTPS.adtApp.szWFSserverRoot = CTPS.adtApp.szServerRoot + '/wfs';

// CTPS.adtApp.adtCountsLayer = 'ctpssde:MPODATA.CTPS_ADT_COUNTLOCS_AND_COUNTS'; // This is in EPSG:26986.
CTPS.adtApp.adtCountsLayer = 'postgis:ctps_adt_countlocs_counts_ggl';    // This is in EPSG:999013; no need to project.

// Data array of records from the CountsLayer, to feed ExtJS paging array data store.
CTPS.adtApp.dataArray = [];

CTPS.adtApp.init = function() {

	Proj4js.reportError = function(msg) { alert('Proj4 error: ' + msg); } ;

	// Enable ExtJS tooltips on toolbar buttons, etc.
	Ext.QuickTips.init();
	
	var resolutions = [156543.033928, 78271.5169639999, 39135.7584820001, 19567.8792409999, 9783.93962049996, 4891.96981024998, 2445.98490512499, 1222.99245256249, 611.49622628138, 305.748113140558, 152.874056570411, 76.4370282850732, 38.2185141425366, 19.1092570712683, 9.55462853563415, 4.77731426794937, 2.38865713397468, 1.19432856685505, 0.597164283559817, 0.29858214169740677];
	var tileSize = new OpenLayers.Size(256,256);
	var tileOrigin = new OpenLayers.LonLat(-20037508.3427870,20037508.3427870);
	var maxExtent = new OpenLayers.Bounds(-8354758.545259952,4858731.935224323,-7582815.991004959,5522904.142066518)	

	CTPS.adtApp.map = new OpenLayers.Map(
		{
			projection : 'EPSG:900913',
			maxExtent  : maxExtent
		}
	);	
	
	var massgisBase = new OpenLayers.Layer.ArcGISCache(
     'MassGIS_Basemap'
    ,'http://tiles.arcgis.com/tiles/hGdibHYSPO59RG1h/arcgis/rest/services/MassGIS_Topographic_Features_for_Basemap/MapServer'
    ,{
       isBaseLayer : true
       ,resolutions: resolutions
      ,tileSize   : tileSize
      ,tileOrigin : tileOrigin
      ,maxExtent  : maxExtent
      ,projection : 'EPSG:900913'
    }
  );
  
    var massgisFeatures = new OpenLayers.Layer.ArcGISCache(
	'MassGIS Features'
	,'http://tiles.arcgis.com/tiles/hGdibHYSPO59RG1h/arcgis/rest/services/MassGIS_Basemap_Detailed_Features/MapServer'
	,{
		isBaseLayer : false
		,visibility : true
		,resolutions: resolutions
      ,tileSize   : tileSize
      ,tileOrigin : tileOrigin
      ,maxExtent  : maxExtent
      ,projection : 'EPSG:900913'
	 }
	);

	var oCountLocations = new OpenLayers.Layer.WMS(
		"Traffic Count Locations",
		CTPS.adtApp.szWMSserverRoot,
		{
			layers: 	CTPS.adtApp.adtCountsLayer,
			styles: 	'traffic_count_locations', 
			transparent: true,
			singleTile: true,
			projection:	'EPSG:900913'
		}
	);

	// Vector layer for "selected" traffic count location(s).											   
	var oStyleSelectedTCLs = new OpenLayers.StyleMap({ 'graphicName'	: 'square',
	                                                   'strokeColor' 	: '#000000',
	                                                   'strokeWidth' 	: 1,
													   'strokeOpacity'	: 1,
													   'fillColor' 		: '#FFFF00',
													   'fillOpacity'	: 0.8,
												       'pointRadius' 	: 4 });										   												   												   
	CTPS.adtApp.oSelectedLayer = new OpenLayers.Layer.Vector(
		"Selected Traffic Count Locations", { styleMap: oStyleSelectedTCLs });
	
	// Vector layer for "highlighted" traffic count location (singular).
	var oStyleHighlightedTCL = new OpenLayers.StyleMap({ 'graphicName'	: 'circle',
	                                                     'strokeColor'  : '#000000',
														 'strokeWidth'  : 1,
														 'fillColor'    : '#F10000',
														 'fillOpacity'  : 0.6,
														 'pointRadius'  : 6 });
	CTPS.adtApp.oHighlightedLayer = new OpenLayers.Layer.Vector(
		"Highlighted Traffic Count Location)", { styleMap: oStyleHighlightedTCL });														 
														 	
	// Add layers to the map.
	// N.B. The "selected" vector layer must be on top of the base layer(s).
	CTPS.adtApp.map.addLayers([massgisBase, massgisFeatures, oCountLocations,
	                           CTPS.adtApp.oSelectedLayer, CTPS.adtApp.oHighlightedLayer]);
	
	var oNavHistory = new OpenLayers.Control.NavigationHistory({autoActivate : false});
	CTPS.adtApp.map.addControl(oNavHistory);
	
	var bQuery = new Ext.Button({	icon	: 'img/query.gif', 
									iconCls	: 'buttonIcon',
									text	: 'Query data by form',
									tooltip	: 'Query data by form',
									handler	: CTPS.adtApp.queryDataByForm
								});
	
	// "SelectBox" add-in control.
	var oSelectBox = new OpenLayers.Control.SelectBox({doneHandler: CTPS.adtApp.queryDataByBbox, 
	                                                   title: "Identify features by drawing a box."});

	var oIdentify = new GeoExt.Action({	control		 : oSelectBox,
										map			 : CTPS.adtApp.map,
										icon         : 'img/query-region.png',
										iconCls      : 'buttonIcon',
										id           : 'queryBox',
										text         : 'Query data by drawing a box',
										tooltip      : 'Query data by drawing a box',
										toggleGroup  : 'navigation',
										handler		 : function() { Ext.getCmp('mapp_anel_div').body.setStyle('cursor','help'); }
									});
							   
	var bClearSelection = new Ext.Button({ 	icon	: 'img/clear_selection.gif',
											iconCls	: 'buttonIcon',
											text	: 'Clear selection',
											tooltip	: 'Clear selection',
											handler	: CTPS.adtApp.clearSelection
										});
	
    var bDownload = new Ext.Button({icon	: 'img/download.gif',
									iconCls	: 'buttonIcon',
									text	: 'Download data',
									tooltip	: 'Download data', 
									handler	: CTPS.adtApp.downloadData
								});	
	
	// We don't yet have the appropriate module to support printing installed in GeoServer.
	// So, for now, don't add this button to the toolbar.
	var bPrint = new Ext.Button({	icon	: 'img/print.gif',
									iconCls	: 'buttonIcon',
									text	: 'Print map',
									tooltip	: 'Print map', 
									handler	: CTPS.adtApp.printMap
								});
	
	var bReset = new Ext.Button({	text	: 'Reset application', 
									tooltip	: 'Reset application', 
									handler	: CTPS.adtApp.resetApplication
								});	
	
    var bHelp = new Ext.Button({icon	: 'img/help.png',
								iconCls	: 'buttonIcon',
								text	: 'Help',
								tooltip	: 'Help', 
								handler	: CTPS.adtApp.displayHelp
							});	
							
	var oZoomIn = new GeoExt.Action({ 	control 	: new OpenLayers.Control.ZoomBox(),
										map			: CTPS.adtApp.map,
										toggleGroup : 'navigation',
										allowDepress: false,
										iconCls 	: 'buttonIcon',
										tooltip 	: 'Zoom in',
										icon 		: 'img/zoom_in.png',
										handler		: function() {
										                   if (navigator.appName == "Microsoft Internet Explorer") {
										                       Ext.getCmp('center-region-container').body.applyStyles('cursor:url("img/zoom_in.cur")');
	                                                       } else {
                                                               Ext.getCmp('center-region-container').body.applyStyles('cursor:crosshair');
                                                           }														   
										}
									});
	
	var oZoomOut = new GeoExt.Action({ 	control 	: new OpenLayers.Control.ZoomBox(Ext.apply({out: true})),
										map			: CTPS.adtApp.map,
										toggleGroup : 'navigation',
										allowDepress: false,
										iconCls 	: 'buttonIcon',
										tooltip 	: 'Zoom out',
										icon 		: 'img/zoom_out.png',
										handler 	: function() {
										                   if (navigator.appName == "Microsoft Internet Explorer") {
										                       Ext.getCmp('center-region-container').body.applyStyles('cursor:url("img/zoom_out.cur")');
														   } else {
															   Ext.getCmp('center-region-container').body.applyStyles('cursor:crosshair');
														   }
										              }
									});

	var oPan = new GeoExt.Action({	control 	: new OpenLayers.Control.DragPan(),
									map 		: CTPS.adtApp.map,
									id 			: 'dragPanButton',
									toggleGroup : 'navigation',
									allowDepress: false,
									iconCls 	: 'buttonIcon',
									tooltip 	: 'Pan',
									icon 		: 'img/pan_arrow.gif',
									pressed 	: true,
									handler      : function() {
												       Ext.getCmp('center-region-container').body.setStyle('cursor','move');
												   }
								}) ;
															
	var bMaxExtent = new Ext.Button({	id			: 'zoomInitExtButton',
										togglegroup	: 'navigation',
										iconCls		: 'buttonIcon',
										tooltip		: 'Zoom to initial extent',
										icon		: 'img/globe.png',
										handler		: function() {
														CTPS.adtApp.zoomToInitialExtent();
										              }
										});

	var oPrevExt = new GeoExt.Action({	control		: oNavHistory.previous,
										id			: 'previousExtButton',
										disabled	: true,
										iconCls		: 'buttonIcon',
										tooltip		: 'Go back to previous extent',
										icon		: 'img/undo.png'
									});
									
	var oNextExt = new GeoExt.Action({	control		: oNavHistory.next,
										id			: 'nextExtButton', 
										disabled	: true,
										iconCls		: 'buttonIcon',
										tooltip		: 'Go to next extent',
										icon		: 'img/redo.png'
									});
									
	// Assemble all the buttons for the toolbar.
	CTPS.adtApp.tb = new Ext.Toolbar({items: [	oZoomIn, oZoomOut, oPan,
	                                            '-',
												bMaxExtent, oPrevExt, oNextExt,
												'-',
												bQuery, oIdentify, bClearSelection, bDownload,
												'->',
												bReset, bHelp
											]});	
	
	CTPS.adtApp.borderPanel = new Ext.Panel({	renderTo	: 'main_panel_div',
												height		: 560,
												width		: 865,
												title		: 'Average Daily Traffic on Massachusetts Roads',
												layout		: 'border',
												tbar		: CTPS.adtApp.tb,
												collapsible	: true,
												items		: [
																{	region		: 'center',
																	id			: 'center-region-container',
																	xtype		: 'gx_mappanel',
																	map			: CTPS.adtApp.map,
																	height		: 550,
																	width		: 855,
																	collapsible	: false,
																	split		: false,
																	margins		: '5 5 5 5'
																}
															]
											});
						
	// Add scale control to map.
	var oScale = new OpenLayers.Control.Scale();
	CTPS.adtApp.map.addControl(oScale);
	
	// Add ScaleBar add-in control
	var oScalebar = new OpenLayers.Control.ScaleBar();
	oScalebar.displaySystem = 'english';
	oScalebar.divisions = 2;
	oScalebar.subdivisions = 2;
	oScalebar.showMinorMeasures = false;
	oScalebar.singleLine = false;
	oScalebar.abbreviateLabel = false;
	CTPS.adtApp.map.addControl(oScalebar);
	
	// Initialize stuff for ExtJS data store and grid.
	CTPS.adtApp.initDataStore(); 
	CTPS.adtApp.clearDataStore();
	CTPS.adtApp.initGrid();
	CTPS.adtApp.renderGrid();
	
	// Enable the previous/next extent control.
	oNavHistory.activate();
	
	// And finally, render the map.
	var oCenter = new OpenLayers.LonLat(-8003974, 5200484);
	var iInitZoomLevel = 8;
	CTPS.adtApp.map.setCenter(oCenter, iInitZoomLevel);
}; // CTPS.adtApp.init()

CTPS.adtApp.initDataStore = function() {
    CTPS.adtApp.dataStore = new Ext.ux.data.PagingArrayStore({
        fields: [
           {name: 'rec_num', type: 'text'},
           {name: 'station_num', type: 'text'}, // N.B. In the database, STATION_NUM is a text field, not a numeric field!
           {name: 'town', type: 'text'},
           {name: 'station_desc', type: 'text'},
		   {name: 'route', type: 'text'},
		   {name: 'shared_routes', type: 'text'},
		   {name: 'cnt_1962', type: 'integer'},
		   {name: 'cnt_1963', type: 'integer'},
		   {name: 'cnt_1964', type: 'integer'},
		   {name: 'cnt_1965', type: 'integer'},
		   {name: 'cnt_1966', type: 'integer'},
		   // {name: 'cnt_1967', type: 'integer'}, // N.B. No data for 1967 and 1968.
		   // {name: 'cnt_1968', type: 'integer'},
		   {name: 'cnt_1969', type: 'integer'},
		   {name: 'cnt_1970', type: 'integer'},
		   {name: 'cnt_1971', type: 'integer'},
		   {name: 'cnt_1972', type: 'integer'},
		   {name: 'cnt_1973', type: 'integer'},
		   {name: 'cnt_1974', type: 'integer'},
		   {name: 'cnt_1975', type: 'integer'},
		   {name: 'cnt_1976', type: 'integer'},
		   {name: 'cnt_1977', type: 'integer'},
		   {name: 'cnt_1978', type: 'integer'},
		   {name: 'cnt_1979', type: 'integer'},
		   {name: 'cnt_1980', type: 'integer'},
		   {name: 'cnt_1981', type: 'integer'},
		   {name: 'cnt_1982', type: 'integer'},
		   {name: 'cnt_1983', type: 'integer'},
		   {name: 'cnt_1984', type: 'integer'},
		   {name: 'cnt_1985', type: 'integer'},
		   {name: 'cnt_1986', type: 'integer'},
		   {name: 'cnt_1987', type: 'integer'},
		   {name: 'cnt_1988', type: 'integer'}, 
		   {name: 'cnt_1989', type: 'integer'},
		   {name: 'cnt_1990', type: 'integer'},
		   {name: 'cnt_1991', type: 'integer'},
		   {name: 'cnt_1992', type: 'integer'},
		   {name: 'cnt_1993', type: 'integer'},
		   {name: 'cnt_1994', type: 'integer'},
		   {name: 'cnt_1995', type: 'integer'},
		   {name: 'cnt_1996', type: 'integer'},
		   {name: 'cnt_1997', type: 'integer'},
		   {name: 'cnt_1998', type: 'integer'},
		   {name: 'cnt_1999', type: 'integer'},
		   {name: 'cnt_2000', type: 'integer'},
		   {name: 'cnt_2001', type: 'integer'},
		   {name: 'cnt_2002', type: 'integer'},
		   {name: 'cnt_2003', type: 'integer'},
		   {name: 'cnt_2004', type: 'integer'},
		   {name: 'cnt_2005', type: 'integer'},
		   {name: 'cnt_2006', type: 'integer'},
		   {name: 'cnt_2007', type: 'integer'},
		   {name: 'cnt_2008', type: 'integer'},
		   {name: 'cnt_2009', type: 'integer'},
		   {name: 'cnt_2010', type: 'integer'}
        ]
    });
}; // CTPS.adtApp.initDataStore()

CTPS.adtApp.clearDataStore = function() {
	// Load the data store with "initial values" data.
	CTPS.adtApp.dataArray = [];
	CTPS.adtApp.dataArray[0] = [ '0', '0', '', '', '', '', 
	                             0, 0, 0, 0, 0, 0, 0, 			// 1962 .. 1966, 1969
								 0, 0, 0, 0, 0, 0, 0, 0, 0,	0,	// 1970 .. 1979
								 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,	// 1980 .. 1989
								 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,	// 1990 .. 1999
								 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 	// 2000 .. 2009
								 0 								// 2010
								];
	  CTPS.adtApp.dataStore.loadData(CTPS.adtApp.dataArray);
	  // Set flag to indicate that the data store contains only dummy data.
	  CTPS.adtApp.bStoreHasRealData = false;
}; // CTPS.adtApp.clearDataStore()

CTPS.adtApp.initGrid = function() {
    CTPS.adtApp.dataGrid = new Ext.grid.GridPanel({
        title		: 'Average Daily Traffic',
        store		: CTPS.adtApp.dataStore,
		renderTo	:'external_grid_div',
		height		: 200,
		width		: 865,
		autoScroll	: true,
		collapsible	: true,
		stripeRows	: true,
        columns: [
            {id:'Record #', header: 'Record #', width: 60, sortable: false, dataIndex: 'rec_num'},
            {header: 'Station #', width: 60, sortable: true, dataIndex: 'station_num'},
            {header: 'Town', width: 100, sortable: true, dataIndex: 'town'},
            {header: 'Station Description', width: 200, sortable: true, dataIndex: 'station_desc'},
			{header: 'Route', width: 50, sortable: true, dataIndex: 'route'},
            {header: 'Shared Routes', width: 100, sortable: true, dataIndex: 'shared_routes'},
			{header: '1962', width: 60, sortable: true, dataIndex: 'cnt_1962'},
			{header: '1963', width: 60, sortable: true, dataIndex: 'cnt_1963'},
			{header: '1964', width: 60, sortable: true, dataIndex: 'cnt_1964'},
			{header: '1965', width: 60, sortable: true, dataIndex: 'cnt_1965'},
			{header: '1966', width: 60, sortable: true, dataIndex: 'cnt_1966'},
			// {header: '1967', width: 60, sortable: true, dataIndex: 'cnt_1967'}, // N.B. No data for 1967 and 1968.
			// {header: '1968', width: 60, sortable: true, dataIndex: 'cnt_1968'},
			{header: '1969', width: 60, sortable: true, dataIndex: 'cnt_1969'},
			{header: '1970', width: 60, sortable: true, dataIndex: 'cnt_1970'},
			{header: '1971', width: 60, sortable: true, dataIndex: 'cnt_1971'},
			{header: '1972', width: 60, sortable: true, dataIndex: 'cnt_1972'},
			{header: '1973', width: 60, sortable: true, dataIndex: 'cnt_1973'},
			{header: '1974', width: 60, sortable: true, dataIndex: 'cnt_1974'},
			{header: '1975', width: 60, sortable: true, dataIndex: 'cnt_1975'},
			{header: '1976', width: 60, sortable: true, dataIndex: 'cnt_1976'},
			{header: '1977', width: 60, sortable: true, dataIndex: 'cnt_1977'},
			{header: '1978', width: 60, sortable: true, dataIndex: 'cnt_1978'},
			{header: '1979', width: 60, sortable: true, dataIndex: 'cnt_1979'},
			{header: '1980', width: 60, sortable: true, dataIndex: 'cnt_1980'},
			{header: '1981', width: 60, sortable: true, dataIndex: 'cnt_1981'},
			{header: '1982', width: 60, sortable: true, dataIndex: 'cnt_1982'},
			{header: '1983', width: 60, sortable: true, dataIndex: 'cnt_1983'},
			{header: '1984', width: 60, sortable: true, dataIndex: 'cnt_1984'},
			{header: '1985', width: 60, sortable: true, dataIndex: 'cnt_1985'},
			{header: '1986', width: 60, sortable: true, dataIndex: 'cnt_1986'},
			{header: '1987', width: 60, sortable: true, dataIndex: 'cnt_1987'},
			{header: '1988', width: 60, sortable: true, dataIndex: 'cnt_1988'},
			{header: '1989', width: 60, sortable: true, dataIndex: 'cnt_1989'},
			{header: '1990', width: 60, sortable: true, dataIndex: 'cnt_1990'},
			{header: '1991', width: 60, sortable: true, dataIndex: 'cnt_1991'},
			{header: '1902', width: 60, sortable: true, dataIndex: 'cnt_1992'},
			{header: '1993', width: 60, sortable: true, dataIndex: 'cnt_1993'},
			{header: '1994', width: 60, sortable: true, dataIndex: 'cnt_1994'},
			{header: '1995', width: 60, sortable: true, dataIndex: 'cnt_1995'},
			{header: '1996', width: 60, sortable: true, dataIndex: 'cnt_1996'},
			{header: '1997', width: 60, sortable: true, dataIndex: 'cnt_1997'},
			{header: '1998', width: 60, sortable: true, dataIndex: 'cnt_1998'},
			{header: '1999', width: 60, sortable: true, dataIndex: 'cnt_1999'},
			{header: '2000', width: 60, sortable: true, dataIndex: 'cnt_2000'},
			{header: '2001', width: 60, sortable: true, dataIndex: 'cnt_2001'},
			{header: '2002', width: 60, sortable: true, dataIndex: 'cnt_2002'},
			{header: '2003', width: 60, sortable: true, dataIndex: 'cnt_2003'},
			{header: '2004', width: 60, sortable: true, dataIndex: 'cnt_2004'},
			{header: '2005', width: 60, sortable: true, dataIndex: 'cnt_2005'},
			{header: '2006', width: 60, sortable: true, dataIndex: 'cnt_2006'},
			{header: '2007', width: 60, sortable: true, dataIndex: 'cnt_2007'},
			{header: '2008', width: 60, sortable: true, dataIndex: 'cnt_2008'},
			{header: '2009', width: 60, sortable: true, dataIndex: 'cnt_2009'},
			{header: '2010', width: 60, sortable: true, dataIndex: 'cnt_2010'}
        ],
	bbar	: new Ext.PagingToolbar({ 	pageSize 	: 20,
										store		: CTPS.adtApp.dataStore,
									    displayInfo	: true
									 })
    });
	// Register on-click event handler for grid.
	CTPS.adtApp.dataGrid.on('rowclick', CTPS.adtApp.gridClickHandler);
}; // CTPS.adtApp.initGrid()

// On-click event handler for data grid.
CTPS.adtApp.gridClickHandler = function(grid, rowIndex, e) {
	var iRecord;
	var szStationNum;
	var szUrl;
	if (CTPS.adtApp.bStoreHasRealData === true) {
		iRecord = CTPS.adtApp.dataStore.getAt(rowIndex);
		szStationNum = iRecord.data['station_num']; // Recall that station_num is a text field, not a numeric field.
		szUrl = CTPS.adtApp.szWFSserverRoot + '?';
		szUrl += '&service=wfs';
		szUrl += '&version=1.0.0';
		szUrl += '&request=getfeature';
		szUrl += '&typename=' + CTPS.adtApp.adtCountsLayer;
		szUrl += "&cql_filter=" + "stationnum=" + "'" + szStationNum + "'";	
		
		OpenLayers.Request.issue({
			method		: "GET",
			url			: szUrl,
			success		: function(oRequest) {
							var oGmlReader = new OpenLayers.Format.GML();
							var aFeatures = oGmlReader.read(oRequest.responseText);
							var oLonLat;
							if (aFeatures.length === 1) {
								// Process the data returned.
								// Clear out the current highlighted count-loc vector layer.
								CTPS.adtApp.oHighlightedLayer.destroyFeatures();
								// Render the count-loc in the "highlighted" count-loc vector layer.								
								CTPS.adtApp.oHighlightedLayer.addFeatures(aFeatures[0]);
								// And pan the map to that location.
								oLonLat = new OpenLayers.LonLat(aFeatures[0].geometry.x, aFeatures[0].geometry.y);
								CTPS.adtApp.map.panTo(oLonLat);
							} else if (aFeatures.length === 0) {
							    Ext.Msg.alert('Massachusetts ADT Traffic Counts', 
								              'WFS request in CTPS.adtApp.gridClickHandler returned no data.');							
							} else {
							    Ext.Msg.alert('Massachusetts ADT Traffic Counts', 
								    'WFS request in CTPS.adtApp.gridClickHandler returned ' + aFeatures.length + ' records.');
							}
						},
			failure		: function(oRequest) {
							Ext.Msg.alert('Massachusetts ADT Traffic Counts', 
							               'WFS request in CTPS.adtApp.gridClickHandler failed.');
						}
		});
	}
}; // CTPS.adtApp.gridClickHandler()

CTPS.adtApp.resetApplication = function() {
	CTPS.adtApp.resetMap();
	CTPS.adtApp.clearDataStore();
	CTPS.adtApp.renderGrid(); 
	// TBD: collapse grid panel?
}; // CTPS.adtApp.resetApplication()

CTPS.adtApp.resetMap = function() {
	// Clear the "selected TCLs" vector layer of the previously selected TCLs, if any.
	CTPS.adtApp.oSelectedLayer.destroyFeatures();
	// Clear the "highlighted TCL" vector layer of the previously highlighted TCL, if there was one.
	CTPS.adtApp.oHighlightedLayer.destroyFeatures();
	// Reset the map's extent to its original center and zoom level.
	CTPS.adtApp.zoomToInitialExtent();
}; // CTPS.adtApp.resetMap()

CTPS.adtApp.zoomToInitialExtent = function() {
	// Reset the map's extent to its original center and zoom level.
	var oCenter = new OpenLayers.LonLat(-8003974, 5200484);
	var iInitZoomLevel = 8;
	CTPS.adtApp.map.setCenter(oCenter, iInitZoomLevel);
}; // CTPS.adtApp.zoomToInitialExtent()

CTPS.adtApp.populateDataStore = function(aFeatures) {
	 // Load the data retrieved from the WFS query into the data store for the ExtJS grid.
	var nFeatures;
	var i;
	
	aFeatures.sort(function(a,b){return(a.attributes['stationnum'] - b.attributes['stationnum']);});
	nFeatures = aFeatures.length;
	CTPS.adtApp.dataArray = [];
	for (i = 0; i < nFeatures; i = i + 1) {
		CTPS.adtApp.dataArray[i] =
					[i+1, aFeatures[i].attributes.stationnum, aFeatures[i].attributes.town,
		            aFeatures[i].attributes.stat_desc, aFeatures[i].attributes.route, aFeatures[i].attributes.alt_routes,
					aFeatures[i].attributes.y1962, aFeatures[i].attributes.y1963, aFeatures[i].attributes.y1964,
					aFeatures[i].attributes.y1965, aFeatures[i].attributes.y1966, 
					// aFeatures[i].attributes.Y1967, aFeatures[i].attributes.Y1968, // N.B. No data for 1967 and 1968.
					aFeatures[i].attributes.y1969,
					aFeatures[i].attributes.y1970, aFeatures[i].attributes.y1971, aFeatures[i].attributesy1972,
					aFeatures[i].attributes.y1973, aFeatures[i].attributes.y1974, aFeatures[i].attributes.y1975,
					aFeatures[i].attributes.y1976, aFeatures[i].attributes.y1977, aFeatures[i].attributes.y1978,
					aFeatures[i].attributes.y1979, 
					aFeatures[i].attributes.y1980, aFeatures[i].attributes.y1981, aFeatures[i].attributes.y1982,
					aFeatures[i].attributes.y1983, aFeatures[i].attributes.y1984, aFeatures[i].attributes.y1985,
					aFeatures[i].attributes.y1986, aFeatures[i].attributes.y1987, aFeatures[i].attributes.y1988,
					aFeatures[i].attributes.y1989,
				    aFeatures[i].attributes.y1990, aFeatures[i].attributes.y1991, aFeatures[i].attributes.y1992,
					aFeatures[i].attributes.y1993, aFeatures[i].attributes.y1994, aFeatures[i].attributes.y1995,
					aFeatures[i].attributes.y1996, aFeatures[i].attributes.y1997, aFeatures[i].attributes.y1998,
					aFeatures[i].attributes.y1999,
					aFeatures[i].attributes.y2000, aFeatures[i].attributes.y2001, aFeatures[i].attributes.y2002,
					aFeatures[i].attributes.y2003, aFeatures[i].attributes.y2004, aFeatures[i].attributes.y2005,
					aFeatures[i].attributes.y2006, aFeatures[i].attributes.y2007, aFeatures[i].attributes.y2008,
					aFeatures[i].attributes.y2009,
					aFeatures[i].attributes.y2010];
	}
	CTPS.adtApp.dataStore.loadData(CTPS.adtApp.dataArray);
}; // CTPS.adtApp.populateDataStore()

CTPS.adtApp.renderGrid = function() {
	// Render the grid to the specified div in the page.
	 CTPS.adtApp.dataGrid.render('external_grid_div'); 
}; // CTPS.adtApp.renderGrid()

CTPS.adtApp.clearSelection = function() {
	CTPS.adtApp.oSelectedLayer.destroyFeatures();
	CTPS.adtApp.oHighlightedLayer.destroyFeatures();
	CTPS.adtApp.clearDataStore();
	CTPS.adtApp.renderGrid();
}; // CTPS.adtApp.clearSelection{}

// TBD: Could be made internal helper function of displayCountLocData.
CTPS.adtApp.highlightCountLocs = function(aFeatures) {
	// Clear the vector layer of the previously highlighted count location(s), if any.
	CTPS.adtApp.oSelectedLayer.destroyFeatures();
	// Render the selected count locations in the vector layer.
	CTPS.adtApp.oSelectedLayer.addFeatures(aFeatures);
}; // CTPS.adtApp.highlightCountLocs()

// TBD: Could be made internal helper function of displayCountLocData.
CTPS.adtApp.zoomToCountLocs = function(aFeatures) {
     // Create empty bounds object.
     // Its extent will be build up as cumulative extent of each count location.
      var oBoundsCountLocs = new OpenLayers.Bounds(); 
	  var iLength = aFeatures.length;
	  var i;
	  for (i = 0; i < iLength; i = i + 1) {
		  oBoundsCountLocs.extend(aFeatures[i].geometry.bounds);
	  }
	  CTPS.adtApp.map.zoomToExtent(oBoundsCountLocs,false);
}; // CTPS.adtApp.zoomToCountLocs()

CTPS.adtApp.displayCountLocData = function(aFeatures) {
	CTPS.adtApp.highlightCountLocs(aFeatures);
	CTPS.adtApp.zoomToCountLocs(aFeatures);
	CTPS.adtApp.populateDataStore(aFeatures);
	CTPS.adtApp.renderGrid();
}; // CTPS.adtApp.displayCountLocdata()

// Query count-locs data by drawing a bounding box on the map.
CTPS.adtApp.queryDataByBbox = function(bounds) {
	var szUrl = "";
	var szBboxCoords = "";
	var szBboxFilter = "";
	
	szUrl = CTPS.adtApp.szWFSserverRoot + '?';
	szUrl += '&service=wfs';
	szUrl += '&version=1.0.0';
	szUrl += '&request=getfeature';
		
	// Part 2 - "canned" BBOX filter.
	szBboxCoords = bounds.left;
	szBboxCoords += ',';
    szBboxCoords += bounds.bottom;
	szBboxCoords += ',';
	szBboxCoords += bounds.right;
	szBboxCoords += ',';
	szBboxCoords += bounds.top;
	szBboxFilter = 'bbox(wkb_geometry,' + szBboxCoords + ')';
	
	szUrl = CTPS.adtApp.szWFSserverRoot + '?';
	szUrl += '&service=wfs';
	szUrl += '&version=1.0.0';
	szUrl += '&request=getfeature';
	szUrl += '&typename=' + CTPS.adtApp.adtCountsLayer; 
	szUrl += '&cql_filter=' + szBboxFilter;
	
	CTPS.adtApp.setDownloadRequest(szBboxFilter);
	
	OpenLayers.Request.issue({
		method		: "GET",
		url			: szUrl,
		success		: function(oRequest) {
						var oGmlReader = new OpenLayers.Format.GML();
						var aFeatures = oGmlReader.read(oRequest.responseText);
						if (aFeatures.length > 0) {
							// Process the data returned.
							CTPS.adtApp.displayCountLocData(aFeatures);
							// Indicate that the store contains "real" data.
							CTPS.adtApp.bStoreHasRealData = true;
							} else {
							    Ext.Msg.alert('Massachusetts ADT Traffic Counts', 'Your bounding box query returned no data.');
							}
						},
		failure		: function(oRequest) {
						Ext.Msg.alert('Massachusetts ADT Traffic Counts', 'WFS request in queryDataByBbox failed.');
					}
		});
	
} // CTPS.adtApp.queryDataByBbox()

// Query count-locs data by filling in and 'submitting' a form.
CTPS.adtApp.queryDataByForm = function() {
	// Object to collect parameters for query from form.
	var oQuery = { 'iTownID'  	 		: 0, 
	               'szRoute' 	 		: "",
				   'szYear'  	 		: "",  
				   'bSearchMapExtent'	: true  // Limit search to current map extent.
				 };
				   
	// Helper function.
	var executeCountLocsQuery = function(queryParms) {
		// #1. Hide the query info form.
		CTPS.adtApp.queryWindow.hide(this);
		
		// #2.  Submit the query as a WFS request, based on the query parameters.
		// #2.A. Assemble the boilerplate parts of the URL for the WFS request.
		var szUrl = "";
		var szFilter = "";
		szUrl = CTPS.adtApp.szWFSserverRoot + '?';
		szUrl += '&service=wfs';
		szUrl += '&version=1.0.0';
		szUrl += '&request=getfeature';
		szUrl += '&typename=' + CTPS.adtApp.adtCountsLayer; 
		
		// #2.B. Construct the query filter based on the parameters entered in the query form.
		var szYearClause = ""; 		
		var szTownClause = "";
		var szRouteClause = "";
		var szExtentClause = "";
		
		if (queryParms.szYear !== "") {
			// I.e., if the count for the specified year are > 0.
			szYearClause = '(y' + queryParms.szYear + ' > 0)';
		}
		if (queryParms.iTownID !== 0) {
			szTownClause = 'town_id=' + queryParms.iTownID;
		}		
		if (oQuery.szRoute !== "") {
			szRouteClause = 'route=' + oQuery.szRoute;
		}
		if (oQuery.bSearchMapExtent === true) {
			var oBounds = CTPS.adtApp.map.getExtent();
			szExtentClause = 'bbox(wkb_geometry,';
			szExtentClause += oBounds.left;
			szExtentClause += ',';
			szExtentClause += oBounds.bottom ;
			szExtentClause += ',';
			szExtentClause += oBounds.right;
			szExtentClause += ',';
			szExtentClause += oBounds.top;
			szExtentClause += ')';
		}	
		// Assemble all the clauses of the query.
		var bHaveAClause = false;
		if (szYearClause !== "") {
			szFilter = szYearClause;
			bHaveAClause = true;
		}
		if (szTownClause !== "") {
			szFilter += (bHaveAClause === false) ? szTownClause : ' AND ' + szTownClause;
			bHaveAClause = true;
		} 
		if (szRouteClause !== "") {
			szFilter += (bHaveAClause === false) ? szRouteClause : ' AND ' + szRouteClause;
			bHaveAClause = true;
		}
		if (szExtentClause !== "") {
			szFilter += (bHaveAClause === false) ? szExtentClause : ' AND ' + szExtentClause;
			bHaveAClause = true;		
		}
			
		// #3. Clear out the query form AND re-initialize the oQuery object.
		clearForm();
		initoQuery();
		
		// #4.  Assemble the full URL for the WFS request, and submit it.
		if (bHaveAClause === true) {
			szUrl += '&cql_filter=' + szFilter;
			CTPS.adtApp.setDownloadRequest(szFilter);
		}
		OpenLayers.Request.issue({
			method		: "GET",
			url			: szUrl,
			success		: function(oRequest) {
							var oGmlReader = new OpenLayers.Format.GML();
							var aFeatures = oGmlReader.read(oRequest.responseText);
							if (aFeatures.length > 0) {
								// Process the data returned.
								CTPS.adtApp.displayCountLocData(aFeatures);
								// Indicate that the store contains "real" data.
								CTPS.adtApp.bStoreHasRealData = true;
							} else {
							    Ext.Msg.alert('Massachusetts ADT Traffic Counts', 'Your query by form returned no data.');
							}
						},
			failure		: function(oRequest) {
							Ext.Msg.alert('Massachusetts ADT Traffic Counts', 'WFS request in executeCountLocsQuery failed.');
						}
		});
	}; // executeCountLocsQuery()

	// Beginning of body of the outer function: CTPS.adtApp.queryDataByForm().
	//
	// Create the window when it is first needed, and reuse it subsequently when required.
	if (!CTPS.adtApp.queryWindow) {
		// We create the elements of the query form one by one, 
		// and then assemble them into the form itself.
		
		// First: Combo box for 'towns'.
	    // This array is ordered by town name, in alphabetical order, to deal with the "Aquinnah" problem.
	    var aTowns = [
            [1, "ABINGTON"], [2, "ACTON"], [3, "ACUSHNET"], [4, "ADAMS"], [5, "AGAWAM"],
			[6, "ALFORD"], [7, "AMESBURY"], [8, "AMHERST"], [9, "ANDOVER"], 
			[104, "AQUINNAH"],
            [10, "ARLINGTON"], [11, "ASHBURNHAM"], [12, "ASHBY"], [13, "ASHFIELD"], [14, "ASHLAND"],
            [15, "ATHOL"], [16, "ATTLEBORO"], [17, "AUBURN"],  [18, "AVON"], [19, "AYER"],
            [20, "BARNSTABLE"], [21, "BARRE"], [22, "BECKET"], [23, "BEDFORD"], [24, "BELCHERTOWN"],
            [25, "BELLINGHAM"], [26, "BELMONT"], [27, "BERKLEY"], [28, "BERLIN"],  [29, "BERNARDSTON"],
            [30, "BEVERLY"], [31, "BILLERICA"], [32, "BLACKSTONE"], [33, "BLANDFORD"], [34, "BOLTON"],
            [35, "BOSTON"], [36, "BOURNE"], [37, "BOXBOROUGH"], [38, "BOXFORD"],  [39, "BOYLSTON"],
            [40, "BRAINTREE"], [41, "BREWSTER"], [42, "BRIDGEWATER"], [43, "BRIMFIELD"], [44, "BROCKTON"],
            [45, "BROOKFIELD"], [46, "BROOKLINE"], [47, "BUCKLAND"], [48, "BURLINGTON"], [49, "CAMBRIDGE"],
            [50, "CANTON"], [51, "CARLISLE"], [52, "CARVER"], [53, "CHARLEMONT"], [54, "CHARLTON"],
            [55, "CHATHAM"], [56, "CHELMSFORD"], [57, "CHELSEA"], [58, "CHESHIRE"], [59, "CHESTER"],
            [60, "CHESTERFIELD"], [61, "CHICOPEE"], [62, "CHILMARK"], [63, "CLARKSBURG"], [64, "CLINTON"],
            [65, "COHASSET"], [66, "COLRAIN"], [67, "CONCORD"], [68, "CONWAY"], [69, "CUMMINGTON"],
            [70, "DALTON"], [71, "DANVERS"], [72, "DARTMOUTH"], [73, "DEDHAM"], [74, "DEERFIELD"],
            [75, "DENNIS"], [76, "DIGHTON"], [77, "DOUGLAS"], [78, "DOVER"], [79, "DRACUT"],
            [80, "DUDLEY"], [81, "DUNSTABLE"], [82, "DUXBURY"], [83, "EAST BRIDGEWATER"], [84, "EAST BROOKFIELD"],
            [85, "EAST LONGMEADOW"], [86, "EASTHAM"], [87, "EASTHAMPTON"], [88, "EASTON"], [89, "EDGARTOWN"],
            [90, "EGREMONT"], [91, "ERVING"], [92, "ESSEX"], [93, "EVERETT"], [94, "FAIRHAVEN"],
            [95, "FALL RIVER"], [96, "FALMOUTH"], [97, "FITCHBURG"], [98, "FLORIDA"], [99, "FOXBOROUGH"],
            [100, "FRAMINGHAM"], [101, "FRANKLIN"], [102, "FREETOWN"], [103, "GARDNER"], [105, "GEORGETOWN"],
            [106, "GILL"], [107, "GLOUCESTER"],[108, "GOSHEN"], [109, "GOSNOLD"],
            [110, "GRAFTON"], [111, "GRANBY"], [112, "GRANVILLE"], [113, "GREAT BARRINGTON"], [114, "GREENFIELD"],
            [115, "GROTON"], [116, "GROVELAND"], [117, "HADLEY"], [118, "HALIFAX"], [119, "HAMILTON"],
            [120, "HAMPDEN"], [121, "HANCOCK"], [122, "HANOVER"], [123, "HANSON"], [124, "HARDWICK"],
            [125, "HARVARD"], [126, "HARWICH"], [127, "HATFIELD"], [128, "HAVERHILL"], [129, "HAWLEY"],
            [130, "HEATH"], [131, "HINGHAM"], [132, "HINSDALE"], [133, "HOLBROOK"], [134, "HOLDEN"],
            [135, "HOLLAND"], [136, "HOLLISTON"], [137, "HOLYOKE"], [138, "HOPEDALE"], [139, "HOPKINTON"],
            [140, "HUBBARDSTON"], [141, "HUDSON"], [142, "HULL"], [143, "HUNTINGTON"], [144, "IPSWICH"],
            [145, "KINGSTON"], [146, "LAKEVILLE"], [147, "LANCASTER"], [148, "LANESBOROUGH"], [149, "LAWRENCE"],
            [150, "LEE"], [151, "LEICESTER"], [152, "LENOX"], [153, "LEOMINSTER"], [154, "LEVERETT"],
            [155, "LEXINGTON"], [156, "LEYDEN"],  [157, "LINCOLN"], [158, "LITTLETON"], [159, "LONGMEADOW"],
            [160, "LOWELL"], [161, "LUDLOW"], [162, "LUNENBURG"], [163, "LYNN"], [164, "LYNNFIELD"],
            [165, "MALDEN"], [166, "MANCHESTER"], [167, "MANSFIELD"], [168, "MARBLEHEAD"], [169, "MARION"],
            [170, "MARLBOROUGH"], [171, "MARSHFIELD"], [172, "MASHPEE"], [173, "MATTAPOISETT"], [174, "MAYNARD"],
            [175, "MEDFIELD"], [176, "MEDFORD"], [177, "MEDWAY"], [178, "MELROSE"], [179, "MENDON"],
            [180, "MERRIMAC"], [181, "METHUEN"], [182, "MIDDLEBOROUGH"], [183, "MIDDLEFIELD"], [184, "MIDDLETON"],
            [185, "MILFORD"], [186, "MILLBURY"], [187, "MILLIS"], [188, "MILLVILLE"], [189, "MILTON"],
            [190, "MONROE"], [191, "MONSON"], [192, "MONTAGUE"], [193, "MONTEREY"], [194, "MONTGOMERY"],
            [195, "MOUNT WASHINGTON"], [196, "NAHANT"], [197, "NANTUCKET"], [198, "NATICK"], [199, "NEEDHAM"],
            [200, "NEW ASHFORD"], [201, "NEW BEDFORD"], [202, "NEW BRAINTREE"], [203, "NEW MARLBOROUGH"], [204, "NEW SALEM"],
            [205, "NEWBURY"],  [206, "NEWBURYPORT"], [207, "NEWTON"], [208, "NORFOLK"], [209, "NORTH ADAMS"],
            [210, "NORTH ANDOVER"], [211, "NORTH ATTLEBOROUGH"], [212, "NORTH BROOKFIELD"], [213, "NORTH READING"], [214, "NORTHAMPTON"],
            [215, "NORTHBOROUGH"], [216, "NORTHBRIDGE"], [217, "NORTHFIELD"], [218, "NORTON"], [219, "NORWELL"],
            [220, "NORWOOD"], [221, "OAK BLUFFS"], [222, "OAKHAM"], [223, "ORANGE"], [224, "ORLEANS"],
            [225, "OTIS"], [226, "OXFORD"], [227, "PALMER"], [228, "PAXTON"], [229, "PEABODY"],
            [230, "PELHAM"], [231, "PEMBROKE"], [232, "PEPPERELL"], [233, "PERU"], [234, "PETERSHAM"],
            [235, "PHILLIPSTON"],  [236, "PITTSFIELD"], [237, "PLAINFIELD"], [238, "PLAINVILLE"], [239, "PLYMOUTH"],
            [240, "PLYMPTON"], [241, "PRINCETON"], [242, "PROVINCETOWN"], [243, "QUINCY"], [244, "RANDOLPH"],
            [245, "RAYNHAM"], [246, "READING"], [247, "REHOBOTH"], [248, "REVERE"], [249, "RICHMOND"],
            [250, "ROCHESTER"], [251, "ROCKLAND"], [252, "ROCKPORT"], [253, "ROWE"], [254, "ROWLEY"],
            [255, "ROYALSTON"], [256, "RUSSELL"], [257, "RUTLAND"], [258, "SALEM"], [259, "SALISBURY"],
            [260, "SANDISFIELD"],  [261, "SANDWICH"],  [262, "SAUGUS"],  [263, "SAVOY"], [264, "SCITUATE"],
            [265, "SEEKONK"], [266, "SHARON"], [267, "SHEFFIELD"], [268, "SHELBURNE"], [269, "SHERBORN"],
            [270, "SHIRLEY"], [271, "SHREWSBURY"],  [272, "SHUTESBURY"], [273, "SOMERSET"],  [274, "SOMERVILLE"],
            [275, "SOUTH HADLEY"], [276, "SOUTHAMPTON"], [277, "SOUTHBOROUGH"], [278, "SOUTHBRIDGE"], [279, "SOUTHWICK"],
            [280, "SPENCER"], [281, "SPRINGFIELD"], [282, "STERLING"], [283, "STOCKBRIDGE"], [284, "STONEHAM"],  
			[285, "STOUGHTON"], [286, "STOW"], [287, "STURBRIDGE"],  [288, "SUDBURY"], [289, "SUNDERLAND"],
            [290, "SUTTON"], [291, "SWAMPSCOTT"], [292, "SWANSEA"], [293, "TAUNTON"], [294, "TEMPLETON"],
            [295, "TEWKSBURY"], [296, "TISBURY"],  [297, "TOLLAND"], [298, "TOPSFIELD"], [299, "TOWNSEND"],
            [300, "TRURO"], [301, "TYNGSBOROUGH"], [302, "TYRINGHAM"], [303, "UPTON"], [304, "UXBRIDGE"],
            [305, "WAKEFIELD"], [306, "WALES"], [307, "WALPOLE"], [308, "WALTHAM"], [309, "WARE"],
            [310, "WAREHAM"], [311, "WARREN"], [312, "WARWICK"], [313, "WASHINGTON"], [314, "WATERTOWN"],
            [315, "WAYLAND"], [316, "WEBSTER"],  [317, "WELLESLEY"], [318, "WELLFLEET"], [319, "WENDELL"],
            [320, "WENHAM"], [321, "WEST BOYLSTON"], [322, "WEST BRIDGEWATER"], [323, "WEST BROOKFIELD"], [324, "WEST NEWBURY"],
            [325, "WEST SPRINGFIELD"], [326, "WEST STOCKBRIDGE"], [327, "WEST TISBURY"], [328, "WESTBOROUGH"], [329, "WESTFIELD"],
            [330, "WESTFORD"], [331, "WESTHAMPTON"], [332, "WESTMINSTER"], [333, "WESTON"], [334, "WESTPORT"],
            [335, "WESTWOOD"], [336, "WEYMOUTH"], [337, "WHATELY"], [338, "WHITMAN"], [339, "WILBRAHAM"],
            [340, "WILLIAMSBURG"], [341, "WILLIAMSTOWN"], [342, "WILMINGTON"],[343, "WINCHENDON"], [344, "WINCHESTER"],
            [345, "WINDSOR"], [346, "WINTHROP"], [347, "WOBURN"], [348, "WORCESTER"], [349, "WORTHINGTON"],
            [350, "WRENTHAM"], [351, "YARMOUTH"]];
    		
	    var cbTownStore = new Ext.data.ArrayStore({idIndex : 0, fields: ['TOWN_ID', 'TOWN']});
	    cbTownStore.loadData(aTowns);
	    var cbTown = new Ext.form.ComboBox({xtype			: 'combo',
											store			: cbTownStore,
										    displayField    : 'TOWN', 
										    valueField      : 'TOWN_ID',
											fieldLabel		: 'in ',
										    typeAhead       : true,
										    emptyText       : 'any town',
										    mode            : 'local',
										    listeners       : { select: function(combo, record, index) {
											                                oQuery.iTownID = record.data.TOWN_ID;
																			// console.log(oQuery.iTownID);
											                            }
											                  } 
									    });

    	// Second: Combo box for 'routes'.
    	var aRoutes = [
            [0,'1'], [1,'1A'], [2,'2'], [3,'2A'], [4,'3'], [5,'3A'], [6,'4'], [7,'5'], [8,'6'], [9,'6A'],
            [10,'7'], [11,'7A'], [12,'8'],  [13,'8A-L'], [14,'8A-U'], [15,'9'], [16,'10'], [17,'12'], [18,'13'],[19,'14'],
            [20,'15'], [21,'16'], [22,'18'], [23,'19'], [24,'20'], [25,'20A'], [26,'21'], [27,'22'], [28,'23'], [29,'24'],
            [30,'25'], [31,'27'], [32,'28'], [33,'28A'], [34,'30'], [35,'31'], [36,'32'], [37,'32A'], [38,'33'], [39,'35'],
            [40,'36'], [41,'37'], [42,'N037'], [43,'38'], [44,'N038'], [45,'39'], [46,'40'], [47,'N040'], [48,'41'], [49,'43'],
            [50,'44'], [51,'N045'], [52,'47'], [53,'N048'], [54,'49'], [55,'53'], [56,'56'], [57,'57'], [58,'58'], [59,'60'],
            [60,'62'], [61,'63'], [62,'66'], [63,'67'], [64,'68'], [65,'70'], [66,'71'], [67,'75'], [68,'78'],[69,'79'],
            [70,'80'], [71,'81'],  [72,'83'], [73,'84'],  [74,'85'],  [75,'88'],  [76,'90'], [77,'91'], [78,'93'], [79,'95'],
            [80,'96'], [81,'97'],  [82,'98'], [83,'99'], [84,'101'],  [85,'102'], [86,'103'],  [87,'104'], [88,'105'], [89,'106'],
            [90,'107'], [91,'108'], [92,'109'],  [93,'110'], [94,'111'],  [95,'112'], [96,'113'], [97,'114'], [98,'114A'], [99,'115'],
            [100,'116'], [101,'117'],  [102,'118'], [103,'119'], [104,'120'], [105,'121'], [106,'122'], [107,'122A'],  [108,'123'], [109,'124'], 
			[110,'125'], [111,'126'],  [112,'127'], [113,'127A'],  [114,'128'], [115,'129'], [116,'129A'], [117,'130'], [118,'131'], [119,'132'],
            [120,'133'], [121,'134'], [122,'135'], [123,'136'], [124,'137'], [125,'138'],  [126,'139'], [127,'140'], [128,'141'], [129,'142'],
            [130,'143'], [131,'145'], [132,'146'], [133,'146A'], [134,'147'], [135,'148'], [136,'149'], [137,'150'], [138,'151'], [139,'152'],
			[140,'159'], [141,'168'], [142,'169'], [143,'177'], [144,'181'], [145,'183'], [146,'186'], [147,'187'], [148,'189'], [149,'190'],
			[150,'192'], [151,'193'], [152,'195'], [153,'197'], [154,'198'], [155,'202'], [156,'203'], [157,'213'], [158,'220'], [159,'225'],
            [160,'228'], [161,'240'], [162,'286'], [163,'290'], [164,'291'], [165,'295'], [166,'S295'],[167,'N352'], [168,'391'], [169,'395'],
            [170,'N454'], [171,'N456'], [172,'N457'], [173,'495']];
    
		var cbRouteStore = new Ext.data.ArrayStore({idIndex: 0, 
													fields: [{name: 'index', type: 'number'},{name: 'ROUTE', type: 'string'}]});
		cbRouteStore.loadData(aRoutes);		
		var cbRoute = new Ext.form.ComboBox({	xtype			: 'combo',
												store			: cbRouteStore,
												displayField    : 'ROUTE', 
												valueField      : 'ROUTE',
												fieldLabel		: 'on ',
												typeAhead       : true,
												emptyText       : 'any route',
												mode            : 'local',
												listeners       : { select: function(combo, record, index) {
											                                oQuery.szRoute = record.data.ROUTE;
																			// console.log(oQuery.szRoute);
											                            }
											                  } 
											}); 
									
		// Third: Combo box for 'years'.
		var aYears = [  [2010,'2010'], [2009,'2009'], [2008,'2008'], [2007,'2007'], [2006,'2006'], 
		                [2005,'2005'], [2004,'2004'], [2003,'2003'], [2002,'2002'], [2001,'2001'], 	
						[2000,'2000'], [1999,'1999'], [1998,'1998'], [1997,'1997'], [1996,'1996'],	
						[1995,'1995'], [1994,'1994'], [1993,'1993'], [1992,'1992'], [1991,'1991'], 	
						[1990,'1990'], [1989,'1989'], [1988,'1988'], [1987,'1987'], [1986,'1986'], 
						[1985,'1985'], [1984,'1984'], [1983,'1983'], [1982,'1982'], [1981,'1981'], 
						[1980,'1980'], [1979,'1979'], [1978,'1978'], [1977,'1977'], [1976,'1976'], 
						[1975,'1975'], [1974,'1974'], [1973,'1973'], [1972,'1972'], [1971,'1971'], 
						[1970,'1970'], [1969,'1969'], // N.B. No data for 1967 and 1968.
						[1966,'1966'], [1965,'1965'], [1964,'1964'], [1963,'1963'], [1962,'1962'] ]; 
				   
		var cbYearStore = new Ext.data.ArrayStore({idIndex: 0, 
												   fields: [{name: 'index', type: 'number'},{name: 'YEAR', type: 'string'}]});
		cbYearStore.loadData(aYears);
		var cbYear = new Ext.form.ComboBox({xtype			: 'multiselect',
											store			: cbYearStore,
											displayField    : 'YEAR', 
											valueField      : 'YEAR',
											fieldLabel		: 'in ',
											typeAhead       : false,
											emptyText       : 'any year',
											mode            : 'local',
											listeners       : { select: function(combo, record, index) {
											                                oQuery.szYear = record.data.YEAR;
																			console.log(oQuery.szYear);
											                            }
											                  } 
										}); 
								
		// Fourth: Check box for 'only search area currently visible in map'.
		var ckMapExtent = new Ext.form.Checkbox({fieldLabel		: '',
												 labelSeparator	: ' ',
												 boxLabel		: 'Only search the ara currently visible in the map.',
												 inputValue		: true,
												 checked		: true,
												 listeners      : { check : function(control, bChecked) {
																				// console.log("Checkbox value: " + bChecked);
																				if (bChecked == true) {
																				    oQuery.bSearchMapExtent = true;
																				} else {
																					oQuery.bSearchMapExtent = false;
																				}
												                             }
																  }
												});
												
		// Fifth: assemble all the elements of the query form into a Ext.FormPanel.	
		// See http://dev.sencha.com/deploy/ext-3.3.1/examples/form/dynamic.html
		// for the model used for the layout of this form.
		var queryForm =  new Ext.FormPanel({	labelWidth	: 40, // label settings here cascade unless overridden
												frame		: true,
												title 		: '',
												bodyStyle	:'padding:5px 5px 0',
												id			: 'myFormPanel',
												width		: 350,
												border		: false,
												defaults	: {width: 280},
												items		: [ cbYear,
																cbTown,
																cbRoute,
																ckMapExtent
															  ]
											});
 
		// Helper function to reset all form fields and "clear out" the oQuery object.
		var clearForm = function() {
		    cbTown.reset();
		    cbRoute.reset();
		    cbYear.reset();
			ckMapExtent.reset();
		}; // clearForm()
		
		// Helper function to "clear out" the oQuery object.
		var initoQuery = function() {
			oQuery.iTownID = 0;
		    oQuery.szRoute = "";
		    oQuery.szYear = "";
			oQuery.bSearchMapExtent = true;		
		}; // Inint oQuery
		
		// Sixth: place the form panel in an Ext.Window, so it may be opened/closed as needed.
		CTPS.adtApp.queryWindow = new Ext.Window({ 	applyTo		: 'form-window',
													width		: 400,
													height		: 260,
													title		: 'I want to find counts ...',
													id			: 'myFormWindow',
													closeAction	: 'hide',
													// frame		: true,
													layout		: 'fit',
													items		: [ queryForm ],
													buttons		: [ { text		: 'Submit Query',
																	  handler	: function() {
																	                  executeCountLocsQuery(oQuery);
																				  }
																	},
																	{ text      : 'Clear Form',
																	  handler   : function() {
																					clearForm();
																					initoQuery();
																				  }
																	},
																	{ text 		: 'Cancel', 
																	  handler 	: function() { 
																	                  clearForm();
																					  initoQuery();
																	                  CTPS.adtApp.queryWindow.hide(this);
																				  } 
																	}
																  ]
												});
	} // end-if query form window hasn't been created
	CTPS.adtApp.queryWindow.show(this);	
}; //CTPS.adtApp.queryDataByForm()

CTPS.adtApp.setDownloadRequest = function(szFilterParm) {
	// Construct the HTML for the entire "download page".
	var szTemp = '<html><head></head><body>';
	szTemp += '<h3>Shapefile Data</h3>';
	szTemp += '<p>To download data in ZIP\'ed shapefile format, click ';
	szTemp += "<a href=\'";
	szTemp += CTPS.adtApp.szWFSserverRoot + '?'; 
	szTemp += "&service=wfs";
	szTemp += "&version=1.0.0";
	szTemp += "&typename=" + CTPS.adtApp.adtCountsLayer; 
	szTemp += "&request=getfeature";
	szTemp += "&outputFormat=SHAPE-ZIP";	
	szTemp += "&cql_filter=" + szFilterParm;
	szTemp += "\'>here</a>.";	
	szTemp += '</p>';		
	
	szTemp += '<h3>Tabular Data Only</h3>';
	szTemp += '<p>To download tabular count data only in CSV format, click ';
	szTemp += "<a href=\'";
	szTemp += CTPS.adtApp.szWFSserverRoot + '?'; 
	szTemp += "&service=wfs";
	szTemp += "&version=1.0.0";
	szTemp += "&typename=" + CTPS.adtApp.adtCountsLayer; 
	szTemp += "&request=getfeature";
	szTemp += "&outputFormat=csv";	
	szTemp += "&cql_filter=" + szFilterParm;
	szTemp += "&propertyname=";
	szTemp += "town,town_id,";
	szTemp += "stat_desc,streetname,";
    szTemp += "route,alt_routes,road_id,stationnum,";
	szTemp += "y1962,y1963,y1964,y1965,y1966,";
		// 1967 and 1968 are missing from the DB table!
		// szTemp += "Y1967,Y1968,";
	szTemp += "y1969," ;
	szTemp += "y1970,y1971,y1972,y1973,y1974,y1975,y1976,y1977,y1978,y1979," ;
	szTemp += "y1980,y1981,y1982,y1983,y1984,y1985,y1986,y1987,y1988,y1989," ;
	szTemp += "y1990,y1991,y1992,y1993,y1994,y1995,y1996,y1997,y1998,y1999," ;
	szTemp += "y2000,y2001,y2002,y2003,y2004,y2005,y2006,y2007,y2008,y2009," ;
	szTemp += "y2010" ;
	szTemp += "\'>here</a>.";	
	szTemp += '</p>';
	szTemp += '</body></html>';
	CTPS.adtApp.downloadText = szTemp;
}; // CTPS.adtApp.setDownloadRequest()

CTPS.adtApp.downloadData = function() {
	// Ext.MessageBox.alert('Download Data', 'Download data not yet implemented.');
	if (!CTPS.adtApp.downloadWindow) {
		CTPS.adtApp.downloadWindow = new Ext.Window({ applyTo		: 'download-window',
													layout			: 'fit',
													width			: 400,
													height			: 280,
													closeAction		: 'hide',
													plain			: true,
													html			: CTPS.adtApp.downloadText,
													buttons			: [ { text 		: 'Close', 
																		  handler 	: function() { CTPS.adtApp.downloadWindow.hide(this); } 
																		}
																	  ]
												});
	}
	CTPS.adtApp.downloadWindow.show(this);
}; // CTPS.adtApp.downloadData()

CTPS.adtApp.printMap = function() {
	// Placeholder.
	Ext.MessageBox.alert('Print Map', 'Print map not yet implemented.');
}; // CTPS.adtApp.printMap()

CTPS.adtApp.displayHelp = function() {
	// Create the window on the 1st click and reuse it on subsequent clicks.
	if (!CTPS.adtApp.helpWindow) {
		CTPS.adtApp.helpWindow = new Ext.Window({ applyTo		: 'help-window',
												 layout			: 'fit',
												 width			: 800,
												 height			: 500,
												 closeAction	: 'hide',
												 autoScroll		: true,
												 autoLoad		: { url : 'adtAppHelp.html' },
												 buttons		: [ { text 		: 'Close', 
																	  handler 	: function() { CTPS.adtApp.helpWindow.hide(this); } 
																	}
																  ]
												});
	}
	CTPS.adtApp.helpWindow.show(this);
}; // CTPS.adtApp.displayHelp()

