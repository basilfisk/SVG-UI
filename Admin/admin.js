// **************************************************************************************
//
//	This file holds the controlling JS functions that are needed to display the
//	Administration system.  Files in the UI directory are standard JS objects
//	that manage the display of individual types of UI control.
//
//	The 'initialise' function is called when the admin.svg file is loaded.
//
// **************************************************************************************

// Global variables
var databaseList = new Array(),
	instanceList = new Array(),
	partitionList = new Array(),
	schemaList = new Array();

// Initialise the UI components
function initialise() {
	// Populate the selection lists
	instanceList = ['Instance A','Instance B','Instance C','Instance D'];
	partitionList = ['Partition A','Partition B','Partition C','Partition D','Partition E','Partition F','Partition G','Partition H','Partition I'];
	databaseList = ['Database A','Database B','Database C','Database D','Database E','Database F','Database G','Database H'];
	schemaList = ['[No Schema]','Schema 1','Schema 2','Schema 3'];

	// Read server status data
	vs.ajaxSynchJSON('status.json', readServerStatus);
}

//--------------------------------------------------------------------------------------
// Post-processing functions, triggered when OK button on form pressed
//--------------------------------------------------------------------------------------
function databaseCreate() {
	var args = '';
	for(var i=0; i<arguments.length; i++) {
		args += arguments[i]+' ';
	}
	alert('Finished databaseCreate: '+args);
	return;
}

function databaseDrop() {
	var args = '';
	for(var i=0; i<arguments.length; i++) {
		args += arguments[i]+' ';
	}
	alert('Finished databaseDrop: '+args);

	var db = arguments[2].split(':');
	if(db[1] == 'Database D') {
		alert('Failure!!!');
	}
	else {
		return;
	}
}

//--------------------------------------------------------------------------------------
// Generate and return snapshot of server status
//--------------------------------------------------------------------------------------
function readServerStatus (json) {
	var row,i,iName,iState,iLocation,iSchema,p,pName,pState,d,arr = [];

	for(i=0; i<json.instance.length; i++) {
		// Read instance data
		iName = json.instance[i].iid;
		iState = json.instance[i].istate;
		iLocation = json.instance[i].ilocation;
		iSchema = json.instance[i].ischema;

		// Read partitions within each instance
		for(p=0; p<json.instance[i].partition.length; p++) {
			pName = json.instance[i].partition[p].pid;
			pState = json.instance[i].partition[p].pstate;

			// Read databases within each partition
			for(d=0; d<json.instance[i].partition[p].database.length; d++) {
				row = [];
				row[0] = iName;
				row[1] = iState;
				row[2] = iLocation;
				row[3] = iSchema;
				row[4] = pName;
				row[5] = pState;
				row[6] = json.instance[i].partition[p].database[d].id;
				row[7] = json.instance[i].partition[p].database[d].state;
				row[8] = json.instance[i].partition[p].database[d].schema;
				row[9] = json.instance[i].partition[p].database[d].file;
				row[10] = json.instance[i].partition[p].database[d].active;
				row[11] = json.instance[i].partition[p].database[d].blocks;
				row[12] = json.instance[i].partition[p].database[d].bytes;
				arr.push(row);
			}
		}
	}

	// Load the application
	vs.window({
		definitions: 'structure.json',
		stylesheet: 'styles.json',
		data: arr
	});
}
