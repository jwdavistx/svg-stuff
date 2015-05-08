var app = (function(){
	var canvas, container, tileSize;
	var tileMatrix = [];

	var tileType = Object.freeze({
		empty: 1,
		blocked: 2,
		start: 3,
		end: 4,
		path: 5
	});

	function initCanvas(params){
		var size = getImageSize(params.image);
		container = params.container;
		canvas = new fabric.Canvas(params.canvas, { 
			width: params.width, 
			height: params.height,
			renderOnAddRemove: false,
			stateful: false,
			//selection: false,
			skipTargetFind: true
		});

		var validTileSizes = utils.getCommonFactors(canvas.getWidth(), canvas.getHeight());
		tileSize = validTileSizes[4];  //8

		initMap(params.image, tileSize);
		initTilesMatrix(tileSize);
	}

	function initMap(imagePath, tileSize){
		var i = new Image();
		i.crossOrigin = 'Anonymous';
		i.src = imagePath;

		fabric.Image.fromURL(i.src, function(img){
			img.selectable = false;
			img.hasControls = false;
			img.hasBorders = false;
			img.hasRotatingPoint = false;

			canvas.add(img);
			initGrid(tileSize);

			canvas.renderAll();
		});
	}

	//Should switch to use HTML5-based naturalHeight/naturalWidth
	function getImageSize(imagePath){
		var img = new Image();
		img.src = imagePath;

		img.onload = function() {
  			return { width: this.width, height: this.height };
		}
	}

	function initGrid(tileSize){
		var x, y;
		var width = canvas.getWidth(), height = canvas.getHeight();

		for(x = 0; x < width; x += tileSize){
			canvas.add(drawGridLine([x, 0, x, canvas.getHeight()]))
		}

		for(y = 0; y < height; y += tileSize){
			canvas.add(drawGridLine([0, y, canvas.getWidth(), y]))
		}

		canvas.renderAll();
	}

	function initTilesMatrix(tileSize){
		var c, r;

		for(c = 0; c < getNumCols(); c++){
			tileMatrix.push([]);
			for(r = 0; r < getNumRows(); r++){
				tileMatrix[c].push({ 
					column: c, 
					row: r, 
					tileType: tileType.empty,
					rect: null
				});
			}
		}
	}

	function drawGridLine(coords){
		return new fabric.Line(coords, {
			fill: 'none',
			stroke: 'grey',
			strokeWidth: .25,
			selectable: false,
			hasControls: false,
			hasBorders: false,
			hasRotatingPoint: false
		});
	}

	function drawTile(pos){
		return new fabric.Rect({
			left: pos.x,
			top: pos.y,
			width: tileSize,
			height: tileSize,
			fill: '#000000',
			selectable: true,
			hasControls: false,
			hasBorders: false,
			hasRotatingPoint: false
		}).on('selected', function(){
			console.log(this.column, this.row);
		});
	}

	function gridToCanvas(column, row){
		return{
			x: column * tileSize,
			y: row * tileSize
		}
	}

	function createTile(column, row, type){
		var pos = gridToCanvas(column, row);
		var rect = drawTile(pos);

		rect.column = column;
		rect.row = row;

		tileMatrix[column][row].tileType = type;
		tileMatrix[column][row].rect = rect;

		return rect;
	}

	function removeTile(column, row){
		var tile = tileMatrix[column][row];
		var rect = tile.rect;

		tile.tileType = tileType.empty;
		tile.rect = null;
		
		rect.remove();
	}

	function getRandomTile(){
		return tileMatrix[utils.getRandomInt(0, getNumCols())][utils.getRandomInt(0, getNumRows())];
	}

	function getNumCols(){
		return canvas.getWidth() / tileSize;
	}

	function getNumRows(){
		return canvas.getHeight() / tileSize;
	}

	function findPath(){
		processImage();
	}

	function processImage(){
		var x, y, canvasData;
		var width = canvas.width, height = canvas.height / 4;
		var maxWorkers = 8, worker;
		
		for(var i = 0; i < maxWorkers; i++){
			y = height * i;
			canvasData = canvas.getContext('2d').getImageData(0, y, width, height);	

			worker = new Worker('./js/processImageData.js');
			worker.onmessage = onMessageResult;
			worker.postMessage({ canvasData: canvasData, tileSize: tileSize, workerIndex: i });
		}
	}

	function onMessageResult(messageEvent){
		console.log("worker finished (" + messageEvent.data.result.index + ")", messageEvent.data.result.length);
	}

	function randomizeGrid(percentOfMax){
		var tile;
		var blockedCount = 0;
		var maxTiles = getNumCols() * getNumRows();
		var density = maxTiles * percentOfMax;
		
		while(blockedCount < density){
			 tile = getRandomTile();

			if(tile.tileType === tileType.empty){
				canvas.add(createTile(tile.column, tile.row, tileType.blocked));
				blockedCount++;
			}
		}

		canvas.renderAll();
	}

	function resetGrid(){
		tileMatrix.forEach(function(tiles){
			tiles.forEach(function(tile){
				if(tile.tileType !== tileType.empty)
					removeTile(tile.column, tile.row);
			});
		});

		canvas.renderAll();
	}

	function bindEventHandlers(){
		$('#find-path').click(function(){
			findPath();
		});

		$('#reset').click(function(){
			resetGrid();
		});

		$('#randomize').click(function(){
			randomizeGrid(.1);
		});

		$(window).resize(function(){

		});
	}

	return {
		initCanvas : initCanvas,
		bindEventHandlers : bindEventHandlers
	}
})();

$(function(){
	app.initCanvas({
		canvas: 'grid',
		width: 1400,
		height: 1640,
		container: $("#page-content"),
		image: './images/maze1.png'
	});

	app.bindEventHandlers();
});