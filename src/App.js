import React, {useEffect} from 'react';
import esriLoader from 'esri-loader';
import {makeStyles} from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({
    viewDiv: {
        width: "100wh",
        height: "100vh",
    },
    optionsDiv: {
        backgroundColor: 'dimgray',
        color: 'white',
        padding: '10px',
        width: '350px',
    },
    // .esri-popup .esri-popup-header .esri-title {
    //     font-size: 18px;
    //     font-weight: bolder;
    //   }
    //
    //   .esri-popup .esri-popup-body .esri-popup-content {
    //     font-size: 14px;
    //   }
}));

const loadData = async () => {
    try {
        const options = {
            url: "https://js.arcgis.com/4.15/init.js",
            css: "https://js.arcgis.com/4.15/esri/themes/light/main.css",
        };
        const [
            Map, MapView, GraphicsLayer, QueryTask, Query
        ] = await esriLoader
            .loadModules(
                [
                    "esri/Map",
                    "esri/views/MapView",
                    "esri/layers/GraphicsLayer",
                    "esri/tasks/QueryTask",
                    "esri/tasks/support/Query"
                ],
                options
            );

        var peaksUrl =
            "https://services.arcgis.com/V6ZHFr6zdgNZuVG0/arcgis/rest/services/Prominent_Peaks_US/FeatureServer/0";

        // Define the popup content for each result
        var popupTemplate = {
            // autocasts as new PopupTemplate()
            title: "{MTN_PEAK}, {STATE}",
            fieldInfos: [
                {
                    fieldName: "ELEV_ft",
                    label: "Elevation (feet)",
                    format: {
                        places: 0,
                        digitSeperator: true
                    }
                },
                {
                    fieldName: "ELEV_m",
                    label: "Elevation (meters)",
                    format: {
                        places: 0,
                        digitSeperator: true
                    }
                },
                {
                    fieldName: "PROMINENCE_ft",
                    label: "Prominence (feet)",
                    format: {
                        places: 0,
                        digitSeperator: true
                    }
                },
                {
                    fieldName: "PROMINENCE_m",
                    label: "Prominence (meters)",
                    format: {
                        places: 0,
                        digitSeperator: true
                    }
                },
                {
                    fieldName: "ISOLATION_mi",
                    label: "Isolation (miles)",
                    format: {
                        places: 0,
                        digitSeperator: true
                    }
                },
                {
                    fieldName: "ISOLATION_km",
                    label: "Isolation (km)",
                    format: {
                        places: 0,
                        digitSeperator: true
                    }
                }
            ],
            content:
                "<b><a href='https://en.wikipedia.org/wiki/Topographic_prominence'>Prominence:</a>" +
                "</b> {PROMINENCE_ft} ft ({PROMINENCE_m} m)" +
                "<br><b>Prominence Rank:</b> {RANK}" +
                "<br><b>Elevation:</b> {ELEV_ft} ft ({ELEV_m} m)" +
                "<br><b><a href='https://en.wikipedia.org/wiki/Topographic_isolation'>Isolation:</a>" +
                "</b> {ISOLATION_mi} mi ({ISOLATION_km} km)"
        };

        // var mtnSymbol = {
        //     type: "point-3d", // autocasts as new PointSymbol3D()
        //     symbolLayers: [
        //         {
        //             type: "object", // autocasts as new ObjectSymbol3DLayer()
        //             resource: {
        //                 primitive: "cone"
        //             }
        //         }
        //     ]
        // };

        // Create graphics layer and symbol to use for displaying the results of query
        var resultsLayer = new GraphicsLayer();

        /*****************************************************************
         *  Point QueryTask to URL of feature service
         *****************************************************************/
        var qTask = new QueryTask({
            url: peaksUrl
        });

        /******************************************************************
         * Set the query parameters to always return geometry and all fields.
         * Returning geometry allows us to display results on the map/view
         ******************************************************************/
        var params = new Query({
            returnGeometry: true,
            outFields: ["*"]
        });

        var map = new Map({
            basemap: "osm",
            layers: [resultsLayer] // add graphics layer to the map
        });

        var view = new MapView({
            map: map,
            container: "viewDiv",
            center: [-100, 38],
            zoom: 4,
            popup: {
                dockEnabled: true,
                dockOptions: {
                    position: "top-right",
                    breakpoint: false
                }
            }
        });

        // Call doQuery() each time the button is clicked
        view.when(function () {
            view.ui.add("optionsDiv", "bottom-right");
            document.getElementById("doBtn").addEventListener("click", doQuery);
        });

        var attributeName = document.getElementById("attSelect");
        var expressionSign = document.getElementById("signSelect");
        var value = document.getElementById("valSelect");

        // Executes each time the button is clicked
        function doQuery() {
            // Clear the results from a previous query
            resultsLayer.removeAll();
            /*********************************************
             *
             * Set the where clause for the query. This can be any valid SQL expression.
             * In this case the inputs from the three drop down menus are used to build
             * the query. For example, if "Elevation", "is greater than", and "10,000 ft"
             * are selected, then the following SQL where clause is built here:
             *
             * params.where = "ELEV_ft > 10000";
             *
             * ELEV_ft is the field name for Elevation and is assigned to the value of the
             * select option in the HTML below. Other operators such as AND, OR, LIKE, etc
             * may also be used here.
             *
             **********************************************/
            params.where =
                attributeName.value + expressionSign.value + value.value;

            // executes the query and calls getResults() once the promise is resolved
            // promiseRejected() is called if the promise is rejected
            qTask
                .execute(params)
                .then(getResults)
                .catch(promiseRejected);
        }

        // Called each time the promise is resolved
        function getResults(response) {
            // Loop through each of the results and assign a symbol and PopupTemplate
            // to each so they may be visualized on the map
            var peakResults = response.features.map(function (feature) {
                // Sets the symbol of each resulting feature to a cone with a
                // fixed color and width. The height is based on the mountain's elevation
                feature.symbol = {
                    type: "simple-marker",  // autocasts as new SimpleMarkerSymbol()
                    style: "diamond",
                    color: [255, 128, 45],  // autocasts as new Color()
                    outline: {              // autocasts as new SimpleLineSymbol()
                        style: "dash-dot",
                        color: [255, 128, 45] // Again, no need for specifying new Color()
                    }
                };

                feature.popupTemplate = popupTemplate;
                return feature;
            });

            resultsLayer.addMany(peakResults);

            // animate to the results after they are added to the map
            view
                .goTo(peakResults)
                .then(function () {
                    view.popup.open({
                        features: peakResults,
                        featureMenuOpen: true,
                        updateLocationEnabled: true
                    });
                })
                .catch(function (error) {
                    if (error.name != "AbortError") {
                        console.error(error);
                    }
                });

            // print the number of results returned to the user
            document.getElementById("printResults").innerHTML =
                peakResults.length + " results found!";
        }

        // Called each time the promise is rejected
        function promiseRejected(error) {
            console.error("Promise rejected: ", error.message);
        }

    } catch (e) {
        console.error(e)
    }
};

const App = () => {

    const classes = useStyles();

    useEffect(() => {
        loadData();
    });

    return (
        <>
            <div id="viewDiv" className={classes.viewDiv}></div>
            <div className={`"esri-widget" ${classes.optionsDiv}`} id="optionsDiv">
                <h2>Prominent Peaks in the U.S.</h2>
                <select className="esri-widget" id="attSelect" defaultValue="PROMINENCE_ft">
                    <option value="ELEV_ft">Elevation</option>
                    <option value="PROMINENCE_ft">Prominence</option>
                </select>
                <select className="esri-widget" id="signSelect">
                    <option value=">">is greater than</option>
                    <option value="<">is less than</option>
                    <option value="=">is equal to</option>
                </select>
                <select className="esri-widget" id="valSelect">
                    <option value="1000">1,000 ft</option>
                    <option value="5000">5,000 ft</option>
                    <option value="10000">10,000 ft</option>
                    <option value="15000">15,000 ft</option>
                    <option value="20000">20,000 ft</option>
                </select>
                <br/>
                <br/>
                <button className="esri-widget" id="doBtn">Do Query</button>
                <br/>
                <p><span id="printResults"></span></p>
            </div>
        </>
    );
};

export default App;
