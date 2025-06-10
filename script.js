// More API functions here:
// https://github.com/googlecreativelab/teachablemachine-community/tree/master/libraries/pose

// the link to your model provided by Teachable Machine export panel
const URL = "https://teachablemachine.withgoogle.com/models/cKMSgOQHx/";
let model, webcam, ctx, labelContainer, maxPredictions;

let stamps;
function reset(){
    stamps=[[0,3,7,10],[1,8],[4,20,23,32,35],[18,21,22,27],[30],[16],[11,25],[26],[12]];
}
reset();
let tolerant=0.8;
function tolerate(){
    tolerant=document.getElementById("tolerant").value/document.getElementById("tolerant").max;
    document.getElementById("tolerance").innerHTML="move accuracy: "+tolerant;
}
let buffer=0.5;
function buff(){
    buffer=Number(document.getElementById("buffer").value);
}
let statsPluh=[2,[0,255,255]];
let sigma=[];


async function init() {
    const modelURL = URL + "model.json";
    const metadataURL = URL + "metadata.json";

    // load the model and metadata
    // Refer to tmImage.loadFromFiles() in the API to support files from a file picker
    // Note: the pose library adds a tmPose object to your window (window.tmPose)
    model = await tmPose.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();

    // Convenience function to setup a webcam
    const size = 450;
    const flip = true; // whether to flip the webcam
    webcam = new tmPose.Webcam(size, size, flip); // width, height, flip
    await webcam.setup(); // request access to the webcam
    await webcam.play();
    window.requestAnimationFrame(loop);

    // append/get elements to the DOM
    const canvas = document.getElementById("canvas");
    canvas.width = size; canvas.height = size;
    ctx = canvas.getContext("2d");
    labelContainer = document.getElementById("label-container");
    for (let i = 0; i < maxPredictions; i++) { // and class labels
        labelContainer.appendChild(document.createElement("div"));
    }
}

async function loop(timestamp) {
    webcam.update(); // update the webcam frame
    await predict();
    window.requestAnimationFrame(loop);
}

async function predict() {
    // Prediction #1: run input through posenet
    // estimatePose can take in an image, video or canvas html element
    const { pose, posenetOutput } = await model.estimatePose(webcam.canvas);
    // Prediction 2: run input through teachable machine classification model
    const prediction = await model.predict(posenetOutput);

    document.getElementById("bricked").style.opacity-=0.1;
    let modif=0.5;
    statsPluh[0]=((statsPluh[0]-2)*modif)+2;
    statsPluh[1][0]=statsPluh[1][0]*modif;
    statsPluh[1][1]=((statsPluh[1][1]-255)*modif)+255;
    statsPluh[1][2]=((statsPluh[1][2]-255)*modif)+255;

    for(let i = 0; i < maxPredictions; i++) {
        const classPrediction = prediction[i].className + ": " + prediction[i].probability.toFixed(2);
        //labelContainer.childNodes[i].innerHTML = classPrediction;
        if(prediction[i].probability>tolerant){
            labelContainer.childNodes[i].innerHTML = classPrediction+"🤑"+stamps[i];

            for(let j=0;j<stamps[i].length;j++){
                if(document.getElementById("instructionVideo").currentTime -buffer <= stamps[i][j] && stamps[i][j] <= document.getElementById("instructionVideo").currentTime +buffer){
                    stamps[i][j]="✅";
                    document.getElementById("bricked").style.opacity=1;
                    const newSound = new Audio("bell.mp3");
                    newSound.volume = 1;
                    newSound.play();
                    statsPluh=[8,[127.5,0,255]];
                }
            }
        }
        else{
            labelContainer.childNodes[i].innerHTML = classPrediction+"💀"+stamps[i];
        }
    }
    // finally draw the poses
    drawPose(pose);

}

function drawPose(pose) {
    if (webcam.canvas) {
        ctx.drawImage(webcam.canvas, 0, 0);
        if (pose) {
            const minPartConfidence = 0.2;
            statsPluh[2]="rgb("+statsPluh[1][0]+","+statsPluh[1][1]+","+statsPluh[1][2]+")";
            //tmPose.drawKeypoints(pose.keypoints, minPartConfidence, ctx, statsPluh[0]*1.5, statsPluh[2], statsPluh[2]);
            //tmPose.drawSkeleton(pose.keypoints, minPartConfidence, ctx, statsPluh[0], statsPluh[2]);
            

            sigma.push([pose.keypoints,minPartConfidence,ctx,statsPluh[0]*1.5,statsPluh[1]]);
            for(let i=0;i<sigma.length;i++){
                tmPose.drawKeypoints(sigma[i][0], sigma[i][1], sigma[i][2], sigma[i][3], "rgba("+sigma[i][4][0]+","+sigma[i][4][1]+","+sigma[i][4][2]+","+ (i/10) +")", "rgba("+sigma[i][4][0]+","+sigma[i][4][1]+","+sigma[i][4][2]+","+ (i/10) +")");
                tmPose.drawSkeleton(sigma[i][0], sigma[i][1], sigma[i][2], sigma[i][3], "rgba("+sigma[i][4][0]+","+sigma[i][4][1]+","+sigma[i][4][2]+","+ (i/10) +")");
            }
            if(sigma.length>10){
                sigma.shift();
            }


        }
    }
}

async function playInstructionVideo() {
    const video = document.getElementById('instructionVideo');
    const videoSrc = video.getAttribute('data-video-src') || 'vid.mp4';
    video.src = videoSrc;
    const videoContainer = video.parentElement;

    video.addEventListener('timeupdate', () => {
        const minutes = Math.floor(video.currentTime / 60);
        const seconds = Math.floor(video.currentTime % 60);
        document.getElementById('videoTime').textContent = 
            `Time: ${minutes}:${seconds.toString().padStart(2, '0')}`;
    });

    const videoCanvas = document.createElement('canvas');
    videoCanvas.id = 'poseCanvas';
    videoCanvas.style.position = 'absolute';
    videoCanvas.style.left = '0';
    videoCanvas.style.top = '0';
    videoCanvas.width = 600;
    videoCanvas.height = 450;

    videoContainer.style.position = 'relative';
    videoContainer.appendChild(videoCanvas);
    const videoCtx = videoCanvas.getContext('2d');

    video.play();

    /*async function processFrame() {
        if (!video.paused && !video.ended) {
            try {
                const { pose, posenetOutput } = await model.estimatePose(video);
                videoCtx.clearRect(0, 0, videoCanvas.width, videoCanvas.height);

                if (pose) {
                    tmPose.drawKeypoints(pose.keypoints, 0.6, videoCtx);
                    tmPose.drawSkeleton(pose.keypoints, 0.6, videoCtx);
                }
            } catch (error) {
                console.error('Pose detection error:', error);
            }
            requestAnimationFrame(processFrame);
        }
    }

    if (model) {
        processFrame();
    } else {
        console.log("https://teachablemachine.withgoogle.com/models/RCAV-K9Y7/");
    }*/
}

function stopInstructionVideo() {
    const video = document.getElementById('instructionVideo');
    video.pause();
    video.currentTime = 0;
    const canvas = video.parentElement.querySelector('canvas');
    if (canvas) {
        canvas.remove();
    }
    reset();
}

function stopWebcam() {
    if (webcam) {
        webcam.stop();
        const canvas = document.getElementById("canvas");
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}
