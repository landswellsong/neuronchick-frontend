// TODO: remove globals from here in packaged code
var gl;
var vertexBuffer; // Straight from tutorial
var trees;
var soma;
var shaderProgram;

var mvMatrix = mat4.create();
var pMatrix = mat4.create();

function setupGL()
{
    /* Getting the context */
    var canvas = document.getElementById("webgl-bed");
    try
    {
        gl = canvas.getContext("experimental-webgl");
    }
    catch (e)
    {   
    }
    if (!gl)
    {
        alert("Failed to initialize WebGL, please make sure your browser does support it");
        return false;
    }
    gl.viewportWidth = canvas.width;
    gl.viewportHeight = canvas.height;
    
    /* Creating the buffers */
    vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([   0.0, 0.0, 0.0,
                                                        10.0, 0.0, 0.0,
                                                        0.0, 0.0, 0.0,
                                                        0.0, 10.0, 0.0,
                                                        0.0, 0.0, 0.0,
                                                        0.0, 0.0, 10.0, ]), gl.STATIC_DRAW);
    vertexBuffer.itemSize = 3;
    vertexBuffer.numItems = 6;

    /* Creating shaders */
    var fragmentShader = getShader(gl, "shader-fs");
    var vertexShader = getShader(gl, "shader-vs");

    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
      alert("Could not initialise shaders");
    }

    gl.useProgram(shaderProgram);
    
    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
    
    shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
    gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);
    
    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
    
    gl.clearColor(0.7, 0.7, 0.8, 1.0);
    
    neuron=getNeuron();
    trees=classifyTrees(neuron);
    soma=generateSoma(neuron);
    
    drawScene();
    
    /* Now installing mouse hooks for camera */
    canvas.addEventListener("mousedown", glCameraMouseDown, false);
    canvas.addEventListener("mouseup", glCameraMouseUp, false);
    canvas.addEventListener("mousemove", glCameraMouseMove, false);
    /* TODO legacy IE and Firefox support */
    canvas.addEventListener("mousewheel", glCameraMouseWheel, false);
}

/* TODO unsafe, checks checks and checks */
function getNeuron()
{
    var req=new XMLHttpRequest();
    req.open("GET","load-neuron.py",false);
    req.setRequestHeader("User-Agent",navigator.userAgent);
    req.send(null)

    if (req.status==200) return JSON.parse(req.responseText);
    else alert("Error executing XMLHttpRequest call!");
}

function colorTransform(colorlabel)
{
    switch (colorlabel)
    {
        case "black": return [ 0.0, 0.0, 0.0 ];
                      break;
        case "blue": return [ 0.0, 0.0, 1.0 ];
                      break;
        case "purple": return [ 1.0, 0.0, 1.0 ];
                      break;
        default: console.log("Unknown color "+colorlabel+". Please add.");
                    return [ 0.0, 0.0, 0.0 ];
                    break;
    }
}

function generateSoma(neuron)
{
    var res={};
    res.data=[];
    res.colors=[];
    // WARNING hardcode by now
    n=100;
    for (i=0; i<n; i++)
        for (j=0; j<n; j++)
        {
            res.data.push(neuron.soma.x[i][j],neuron.soma.y[i][j],neuron.soma.z[i][j]);
            res.colors.push(i/n,j/n,0.0,1.0);
        }
    
    res.buffer=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, res.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(res.data), gl.STATIC_DRAW);
    res.buffer.itemSize = 3;
    res.buffer.numItems = res.data.length/3;
    
    res.colbuffer=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, res.colbuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(res.colors), gl.STATIC_DRAW);
    res.colbuffer.itemSize = 4;
    res.colbuffer.numItems = res.data.length/3;
    
    return res;
}

function classifyTrees(neuron)
{
    var res={};
    for (i in neuron.trees)
    {
        var tr=neuron.trees[i]
        var lw=tr.linewidth
        if (res[lw]==undefined)
        {
            res[lw]={};
            res[lw].data=[];
            res[lw].colors=[];
        }
        res[lw].data.push(tr.x[0],tr.y[0],tr.z[0],tr.x[1],tr.y[1],tr.z[1]);
        var col=tr.color;
        if (typeof(col)=="string")
            col=colorTransform(col);
        res[lw].colors.push(col[0], col[1], col[2], tr.alpha, col[0], col[1], col[2], tr.alpha);
    }
    
    for (i in res)
    {
        res[i].buffer=gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, res[i].buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(res[i].data), gl.STATIC_DRAW);
        res[i].buffer.itemSize = 3;
        res[i].buffer.numItems = res[i].data.length/3;
        
        res[i].colbuffer=gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, res[i].colbuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(res[i].colors), gl.STATIC_DRAW);
        res[i].colbuffer.itemSize = 4;
        res[i].colbuffer.numItems = res[i].data.length/3;
    }
    
    return res;
}

/* Taken from tutorial */
function getShader(gl, id) {
    var shaderScript = document.getElementById(id);
    if (!shaderScript) {
        return null;
    }
    
    if (shaderScript.src)
    {
        var req=new XMLHttpRequest();
        req.open("GET",shaderScript.src,false);
        req.setRequestHeader("User-Agent",navigator.userAgent);
        req.send(null)

        if (req.status==200) str=req.responseText;
        else alert("Error executing XMLHttpRequest call!");
    }
    else
    {
        var str = "";
        var k = shaderScript.firstChild;
        while (k) {
            if (k.nodeType == 3)
                str += k.textContent;
            k = k.nextSibling;
        }
    }
    
    var shader;
    if (shaderScript.type == "x-shader/x-fragment") {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (shaderScript.type == "x-shader/x-vertex") {
        shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
        return null;
    }
    
    gl.shaderSource(shader, str);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(shader));
        return null;
    }
    
    return shader;
}

/* Camera vars */
var cam = {};
cam.dist=500.0;
cam.alpha=0.0;
cam.beta=0.0;
cam.isMoving=false;
cam.moveOrigin=null;
cam.moveRate=3.14/180.0; /* Mouse shift in pixels to radians, TODO: autocalculate by dimensions */
cam.zoomFunc=function(delta)
{
    cam.dist-=delta;
}

function glCameraMouseDown(evt)
{
    cam.isMoving=true;
    cam.moveOrigin=evt;
}

function glCameraMouseUp(evt)
{
    cam.isMoving=false;
    cam.moveOrigin=null;
}

function glCameraMouseMove(evt)
{
    if (cam.isMoving)
    {
        cam.alpha-=cam.moveRate*(cam.moveOrigin.y-evt.y);
        cam.beta-=cam.moveRate*(cam.moveOrigin.x-evt.x);
        cam.moveOrigin=evt;
        /* TODO: that's ugly, probably we need to redraw on timer in case we want to animate something */
        drawScene();
    }
}

function glCameraMouseWheel(evt)
{
    cam.zoomFunc(evt.wheelDelta);
    drawScene();
}

function drawScene()
{
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    mat4.perspective(pMatrix, 45, gl.viewportWidth / gl.viewportHeight, 0.1, 5000.0);
    mat4.mul(pMatrix, pMatrix, mat4.lookAt(mat4.create(), [ cam.dist*Math.cos(cam.alpha)*Math.cos(cam.beta), // Eye
                                                            cam.dist*Math.sin(cam.alpha),
                                                            cam.dist*Math.cos(cam.alpha)*Math.sin(cam.beta), ],
                                                          [ 0.0, 0.0, 0.0, ], // Look at
                                                          [ 0.0, Math.cos(cam.alpha)>0?1.0:-1.0, 0.0, ])); // Up
    mat4.identity(mvMatrix);
//     mat4.translate(mvMatrix, mvMatrix, [-1.5, 0.0, -7.0]);
    
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, soma.buffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, soma.buffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, soma.colbuffer);
    gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, soma.colbuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.POINTS, 0, soma.buffer.numItems);
    
    for (i in trees)
    {
        gl.bindBuffer(gl.ARRAY_BUFFER, trees[i].buffer);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, trees[i].buffer.itemSize, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, trees[i].colbuffer);
        gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, trees[i].colbuffer.itemSize, gl.FLOAT, false, 0, 0);
        gl.lineWidth(i);
        gl.drawArrays(gl.LINES, 0, trees[i].buffer.numItems);
    }
}
