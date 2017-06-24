import os
import json
import config
from flask import Flask, render_template, request, url_for, redirect
from werkzeug.utils import secure_filename

app = Flask(__name__)

#######################################
# Constants
#######################################
VIDEO_UPLOAD_FOLDER = 'static/VideoFiles/'
AUDIO_FOLDER = 'static/AudioFiles/'
FRAMES_FOLDER = 'static/VideoFrames/'
PREDICTION_FOLDER = 'static/Prediction/'
PLOTS_FOLDER = 'static/Plots/'
ASSETS = 'static/Assets/'
URL_FILE = VIDEO_UPLOAD_FOLDER + 'videoLink.txt'
DATA_FILE = ASSETS + 'runningData.txt'
RESULTS_FILE = ASSETS + 'finalPrediction.txt'
LOG_FILE = ASSETS + 'EmoAIlog.log'
ENDPOINTS = ['index','Input','Progress', 'Prediction', 'PastRuns']
ALLOWED_EXTENSIONS = set([])

#######################################
# Configuration
#######################################
app.config['VIDEO_UPLOAD_FOLDER'] = VIDEO_UPLOAD_FOLDER
app.config['AUDIO_FOLDER'] = AUDIO_FOLDER
app.config['FRAMES_FOLDER'] = FRAMES_FOLDER
app.config['PREDICTION_FOLDER'] = PREDICTION_FOLDER
app.config['PLOTS_FOLDER'] = PLOTS_FOLDER
app.config['ASSETS'] = ASSETS

#######################################
# Setup
#######################################
if os.path.isdir(VIDEO_UPLOAD_FOLDER) is False:
    os.makedirs(VIDEO_UPLOAD_FOLDER)

if os.path.isdir(AUDIO_FOLDER) is False:
    os.makedirs(AUDIO_FOLDER)

if os.path.isdir(FRAMES_FOLDER) is False:
    os.makedirs(FRAMES_FOLDER)

if os.path.isdir(PREDICTION_FOLDER) is False:
    os.makedirs(PREDICTION_FOLDER)

if os.path.isdir(PLOTS_FOLDER) is False:
    os.makedirs(PLOTS_FOLDER)

if os.path.isdir(ASSETS) is False:
    os.makedirs(ASSETS)

#######################################
# Routing
#######################################

@app.route('/', methods=['GET','POST'])
def index():
    '''
    GET
        Display some sort of dashboard
    POST
        unused
    '''
    if request.method == 'POST':
        log('Index POST')
        return render_template('index.html')
    else:
        log('Index GET')
        return render_template('index.html', ENDPOINTS = ENDPOINTS)

@app.route('/Input', methods=['GET','POST'])
def Input():
    '''
    GET
        Present input options
    POST
        Save video file from url or file upload
        Run preliminary operations *if needed* before prediction phase
    '''
    if request.method == 'POST':
        log('Input POST')

        out = None
        url = request.form['URLInput']
        log('Checking url...it is ' + url)

        if url:
            log('Processing url')
            # Remove last videofile being dealt with
            clearVideoDir()

            if config.ConfigVars['DownloadURLS'] == 0:
                log('Writing video url to file')
                with open(URL_FILE, 'w') as linkFile:
                     linkFile.write(url)
                     linkFile.close()
                log('Done writing video url to file')

            else:
                log('Downloading url')
                videoPath = downloadVideo(url)

                if config.ConfigVars['PreProcessVideos'] == 1:
                    log('PreProcessing downloaded video')
                    out = processURL(videoPath)

        elif 'VideoInput' in request.files:
            log('User uploaded a video')
            # Remove last videofile being dealt with
            clearVideoDir()

            # Save the input video file
            inVideo = request.files['VideoInput']
            videoPath = saveVideoInDir(inVideo)
            log('Saved user video to ' + videoPath)

            # process video before passing to prediction
            if config.ConfigVars['PreProcessVideos'] == 1:
                log('PreProcessing uploaded video')
                out = processVideo(videoPath)

        log('Redirecting to progress page')
        return redirect(url_for('Progress'))
    else:
        log('Input GET')
        return render_template('Input.html')

@app.route('/Progress', methods=['GET','POST'])
def Progress():
    '''
    GET
        Use DATA_FILE to regen or generate current progress for prediction
    POST
        Start the prediction for video in VIDEO_UPLOAD_FOLDER
        output to DATA_FILE, AUDIO_FOLDER, FRAMES_FOLDER to generate js visualization

        *STRETCH* Zip all items for future access
    '''
    if request.method == 'POST':
        log('Progress POST')
        # Start the Prediction

        # At every check in update DATA_FILE -> triggers JS update

        # When done enable show me the money OR redirect to show me the money

        # *STRETCH* Zip all artifacts with a unique id for future access

        return render_template('Progress.html')
    else:
        log('Progress GET')

        # Use last DATA_FILE to generate the js visualizations
        data = None

        log('Reading ' + DATA_FILE + ' for progress data')
        with open(DATA_FILE, 'r') as datFile:
            data = datFile.readlines()
            datFile.close()

        log('Rendering progress data')
        # Enable show me the money
        return render_template('Progress.html', data=data)

@app.route('/Prediction', methods=['GET','POST'])
def Prediction():
    '''
    GET
        Generate a js visualization based on RESULTS_FILE
    POST
        unused
    '''
    if request.method == 'POST':
        log('Prediction POST')
        # Most likely unused

        return render_template('Prediction.html')
    else:
        log('Prediction GET')
        # Using DATA_FILE and final prediction from model, show js frontend
        data = None

        log('Reading ' + DATA_FILE + ' for progress data')
        with open(DATA_FILE, 'r') as datFile:
            data = datFile.readlines()
            datFile.close()

        finalPrediction = None
        log('Reading ' + RESULTS_FILE + ' for final prediction data')
        with open (RESULTS_FILE, 'r') as finFile:
            finalPrediction = finFile.readlines()
            finFile.close()

        log('Rendering progress and final analysis data')
        # Newly populated X folder
        return render_template('Prediction.html', data=data, finalPrediction=finalPrediction)

@app.route('/PastRuns', methods=['GET','POST'])
def PastRuns():
    '''
    *STRETCH*
    GET
        past runs and be able to display their
        progress and final predication on demand
    POST
        Replace current DATA_FILE and RESULTS_FILE
        with selected run's files and redirect to progress view
    '''
    if request.method == 'POST':
        log('PastRuns POST')
        # After selecting a past run, take its results files to be able to regen the progress and prediction screens

        # Copy particular run's *ID*_DATA_FILE to DATA_FILE

        # Copy particular run's *ID*_RESULTS_FILE to RESULTS_FILE

        # Redirect to Progress

        return render_template('PastRuns.html')
    else:
        log('PastRuns GET')
        # Show all past runs that canbe viewed with their appropriate *ID*'s'
        return render_template('PastRuns.html')

#######################################
# Utility methods
#######################################

def processURL(inputURL):
    '''
    Run any intermediary steps on the video before entering prediction phase
    '''
    log('Running PreProcessing on ' + inputURL)

    videoFile = None
    return videoFile

def processVideo(inputPath):
    '''
    Run any intermediary steps on the video before entering prediction phase
    '''
    log('Running PreProcessing on ' + inputPath)

    videoFile = None
    return videoFile

def clearVideoDir():
    log('Clearing ' + VIDEO_UPLOAD_FOLDER)
    if len(os.listdir(VIDEO_UPLOAD_FOLDER)) > 0:
        for tempFile in os.listdir(VIDEO_UPLOAD_FOLDER):
            log ('Removing ' + tempFile)
            os.remove(os.path.join(app.config['VIDEO_UPLOAD_FOLDER'],tempFile))
    log('Done clearing ' + VIDEO_UPLOAD_FOLDER)
    return True

def saveVideoInDir(vid):
    log('Saving ' + vid.filename + ' to ' + VIDEO_UPLOAD_FOLDER)

    filename = secure_filename(vid.filename)
    fileDest = os.path.join(app.config['VIDEO_UPLOAD_FOLDER'], filename)
    vid.save(fileDest)

    return fileDest

def downloadVideo(videoURL):
    '''
    Get the video located at videoURL and save in VIDEO_UPLOAD_FOLDER as *.mp4
    '''
    log('Downloading ' + videoURL + ' and saving as video.mp4')

    downloadedVideo = VIDEO_UPLOAD_FOLDER + 'video.mp4'

    return downloadedVideo

def log(text):
    text = str(text)
    if config.ConfigVars['LogLevel'] == 0:
        return True

    if config.ConfigVars['LogLevel'] == 3:
        with open(LOG_FILE, 'a') as logger:
            logger.write(text)
            logger.close()
        print(text)
        return True

    if config.ConfigVars['LogLevel'] == 2:
        print(text)

    if config.ConfigVars['LogLevel'] == 1:
        with open(LOG_FILE, 'a') as logger:
            logger.write(text)
            logger.close()

def doPrediction():
    log('Starting prediction')

    log('Done with prediction')
    return True

#######################################
# Running
#######################################
if __name__ == '__main__':
    app.run(debug=True)
