//http://srchea.com/experimenting-with-web-audio-api-three-js-webgl
//http://www.smartjava.org/content/exploring-html5-web-audio-visualizing-sound

/*
MediaElementAudioSourceNode - use the audio provided by a media element. 
MediaStreamAudioSourceNode - can use the microphone as input (see my previous article on sound recognition). 
AudioBufferSourceNode - load the data from an existing audio file (e.g mp3) and use that as input. 
https://webaudio.github.io/web-audio-api/
https://webaudio.github.io/web-audio-api/#AudioBufferSourceNode
*/

/*
To create a volume meter, we need to do:

1. Create an analyzer node: 
With this node we get realtime information about the data that is processed. 
This data we use to determine the signal strength.

2.Create a javascript node: 
We use this node as a timer to update the volume meters with new information

3.Connect everything together
//http://www.smartjava.org/content/exploring-html5-web-audio-visualizing-sound
*/


var context;
var source, sourceJs;
var analyser;
var url = 'Sound-Visualizer/data/Nighttime.mp3';
var array = new Array();
var boost = 0;
var average = 0;
var maxAudioValue;

// ----- INSTANTIATE 7 FREQUENCY BANDS -----
//bin 0 to 1 represent 0 - 86.132 hz 
var averageFreqBand1; //subBass, 20-60

//bin 2 to 5 represent 86.132-258.394 hz 
var averageFreqBand2; //bass, 60-250 

//bin6-11 represent 258.394-516.79 hz
var averageFreqBand3; //lowMidRange, 250-500 

//bin 12-46 represent 516.79-2024.1 hz
var averageFreqBand4; //midRange, 500-2000 

//bin 47-1024 represent 2067.166-20,000 hz
var averageFreqBand5to7;
//var averageFreqBand5; //upperMidRange, 2000-4000 
//var averageFreqBand6; //presence, 4000-6000
//var averageFreqBand7; //brilliance, 6000-20000
// ----- END INSTANTIATE 7 FREQUENCY BANDS -----

var interval = window.setInterval(function() {
	if($('#loading_dots').text().length < 3) {
		$('#loading_dots').text($('#loading_dots').text() + '.');
	}
	else {
		$('#loading_dots').text('');
	}
}, 500);

// main object of the Web Audio API is the AudioContext object
// check browser support for AudioContext
try {
	if(typeof webkitAudioContext === 'function' || 'webkitAudioContext' in window) {
		context = new webkitAudioContext();
	}
	else {
		context = new AudioContext();
	}
}
catch(e) {
	$('#info').text('Web Audio API is not supported in this browser');
}

// To load the file, need to use a response type specified in the XMLHttpRequest level 2: ArrayBuffer.
// loads sound

/* 
The W3C advises us on using this method instead of createBuffer method 
because "it is asynchronous and does not block the main JavaScript thread". 
*/
var request = new XMLHttpRequest();
request.open("GET", url, true); //url is the mp3
request.responseType = "arraybuffer";


//when loaded, decode the data
request.onload = function() {

	//decode the array buffer with the decodeAudioData() method.
	//AudioContext.decodeAudioData(audioData, successCallback, errorCallback);
	context.decodeAudioData(
		request.response,
		function(buffer) {
			if(!buffer) {
				$('#info').text('Error decoding file data');
				return;
			}

			////2. JAVASCRIPT NODE------------------------------------------------------
			/*
			ScriptProcessorNode processes the raw audio data directly from javascript.
			created with the AudioContext.createJavaScriptNode(bufferSize), 
			it handles on how many the onaudioprocess event is dispatched. 
			*/

			/*
			The bufferSize must be in units of sample frames, i.e., one of:
			256, 512, 1024, 2048, 4096, 8192, 16384.
			It controls the frequency of callbacks asking for a buffer refill. 
			Smaller sizes allow for lower latency and higher for better overall quality.
			//https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/createJavaScriptNode
			*/
			//AudioContext.createJavaScriptNode(bufferSize, numInputChannels, numOutputChannels)
			sourceJs = context.createScriptProcessor(2048, 1, 1);
			/*
			This will create a ScriptProcessor that is called whenever the 2048 frames 
			have been sampled. Since our data is sampled at 44.1k, this function will be 
			called approximately 21 times a second.
			*/
			sourceJs.buffer = buffer;
			sourceJs.connect(context.destination);
			/*
			connects source to destination
			http://www.smartjava.org/content/exploring-html5-web-audio-visualizing-sound
			*/

			////1. ANALYZER NODE------------------------------------------------------
			/*
			AnalyserNode, created with AudioContext.createAnalyser(), 
			It provides real-time frequency and time-domain analysis information.
			The audio stream will be passed un-processed from input to output.
			*/
			
			/*
			This node splits up the signal in frequency buckets and we get the amplitude 
			(the signal strenght) for each set of frequencies
			*/

			//This creates an analyzer node whose result will be used to create the volume meter.
			analyser = context.createAnalyser();
			/*
			We use a smoothingTimeConstant to make the meter less jittery. 
			With this variable we use input from a longer time period to calculate the amplitudes, 
			this results in a more smooth meter.
			*/

			analyser.smoothingTimeConstant = 0.6;

				/*
				smoothingTimeConstant property of the AnalyserNode interface is a double 
				value representing the averaging constant with the last analysis frame. 
				It's basically an average between the current buffer and the last buffer 
				the AnalyserNode processed, and results in a much smoother set of value changes over time.

				smoothingTimeConstant property's value defaults to 0.8; it must be in the range 0 to 1 
				(0 meaning no time averaging). If 0 is set, there is no averaging done, whereas a value 
				of 1 means "overlap the previous and current buffer quite a lot while computing the value", 
				which essentially smoothes the changes across 
				AnalyserNode.getFloatFrequencyData/AnalyserNode.getByteFrequencyData calls.
				
				//https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/smoothingTimeConstant
				*/

			/*
			The fftSize determine how many buckets we get containing frequency information. 
			If we have a fftSize of 1024 we get 512 buckets. If it is 512, then 256.
			
			http://www.smartjava.org/content/exploring-html5-web-audio-visualizing-sound
			*/
			analyser.fftSize = 512;//2048;
				/*
				fftSize property of the AnalyserNode interface is an unsigned long value representing 
				the size of the FFT (Fast Fourier Transform) to be used to determine the frequency domain.

				The fftSize property's value must be a non-zero power of 2 in a range from 32 to 2048; 
				its default value is 2048.
				https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/fftSize
				*/

			/*
			When this node receives a stream of data, it analyzes this stream and provides 
			us with information about the frequencies in that signal and their strengths. 
			We now need a timer to update the meter at regular intervals. 
			We could use the standard javascript setInterval function, 
			but since we're looking at the Web Audio API, we use ScriptProcessorNode - shown above (#2)
			*/

			/*AudioBufferSourceNode, created with 
			AudioContext.createBufferSource(), that is for the playback.

			//https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/createBufferSource
			*/

			source = context.createBufferSource();
			source.buffer = buffer;
			source.loop = true;
				/*
				HTMLMediaElement.loop
				//The HTMLMediaElement.loop property reflects the loop HTML attribute, 
				which controls whether the media element should start over when it reaches the end.
				boolean value.
				
				//https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/loop
				*/

			//3. CONNECT TOGETHER------------------------------------------------------
			/*
			After creating these nodes, we need to connect them. 
			The node source is connected to the analyser node which 
			is connected to the script processor node. 
			The main node is connected to the destination, 
			that is to say the sound card.
			*/
	
			/*
			AudioBufferSourceNode.connect(AnalyserNode);
			AnalyserNode.connect(ScriptProcessorNode);
			AudioBufferSourceNode.connect(AudioContext.destination);
			*/
			source.connect(analyser); 
				/* Definition: AudioBufferSourceNode
				AudioBufferSourceNode interface represents an audio source 
				consisting of in-memory audio data, stored in an AudioBuffer*. //(* definition below)
				It is an AudioNode* that acts as an audio source. //(* definition below)
				//https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode
				*/
					/* Definition: AudioBuffer
					AudioBuffer interface represents a short audio asset residing in memory, 
					created from an audio file using the AudioContext.decodeAudioData() method, 
					or from raw data using AudioContext.createBuffer(). Once put into an AudioBuffer, 
					the audio can then be played by being passed into an AudioBufferSourceNode.

					Objects of these types are designed to hold small audio snippets, typically less than 45 s. 
					For longer sounds, objects implementing the MediaElementAudioSourceNode are more suitable. 
					The buffer contains data in the following format:  non-interleaved IEEE754 32-bit linear PCM 
					with a nominal range between -1 and +1, that is, 32bits floating point buffer, with each samples 
					between -1.0 and 1.0. If the AudioBuffer has multiple channels, they are stored in separate buffer.
					//https://developer.mozilla.org/en-US/docs/Web/API/AudioBuffer
					*/

					/* Definition: AudioNode
					AudioNode interface is a generic interface for representing an audio processing module 
					like an audio source (e.g. an HTML <audio> or <video> element, an OscillatorNode, etc.), 
					the audio destination, intermediate processing module (e.g. a filter like BiquadFilterNode 
					or ConvolverNode), or volume control (like GainNode).
					//https://developer.mozilla.org/en-US/docs/Web/API/AudioNode
					*/

			analyser.connect(sourceJs); //use the javascript node (sourceJs) to draw at a specific interval.
				/* Definition: AnalyserNode
				AnalyserNode interface represents a node able to provide real-time frequency and time-domain 
				analysis information. It is an AudioNode that passes the audio stream unchanged from the input 
				to the output, but allows you to take the generated data, process it, and create audio visualizations.
				//https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode
				*/

				/* Definition: ScriptProcessorNode
				ScriptProcessorNode interface allows the generation, processing, or analyzing of audio using JavaScript. 
				It is an AudioNode audio-processing module that is linked to two buffers, one containing the input audio 
				data, one containing the processed output audio data. An event, implementing the AudioProcessingEvent 
				interface, is sent to the object each time the input buffer contains new data, and the event handler 
				terminates when it has filled the output buffer with data.
				//https://developer.mozilla.org/en-US/docs/Web/API/ScriptProcessorNode
				*/
			
			source.connect(context.destination); //and connect source node to destination, if you want audio
				/* Definition: AudioContext.destination
				The destination property of the AudioContext interface returns an AudioDestinationNode representing 
				the final destination of all audio in the context. It often represents an actual audio-rendering 
				device such as your device's speakers.
				//https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/destination
				*/

			/*
			Now, we are getting the binaries from frequencies at the 
			current time and copy the data into unsigned byte array. 
			We will use the array to scale the cubes regarding the values.
			*/

			/*
			ScriptProcessorNode.onaudioprocess = function(e) {
			    array = new Uint8Array(AnalyserNode.frequencyBinCount);
			    AnalyserNode.getByteFrequencyData(array);
			};
			//link: https://developer.mozilla.org/en-US/docs/Web/API/ScriptProcessorNode
			*/

			/*
			Event handlers:
				'ScriptProcessorNode.onaudioprocess'
			Represents the EventHandler to be called.
			*/
			sourceJs.onaudioprocess = function(e) { //javascript node is called

				array = new Uint8Array(analyser.frequencyBinCount);// Uint8Array reference above
				/*
				The Uint8Array typed array represents an array of 8-bit unsigned integers. (positive numbers) lets you use 0 to 255
				The contents are initialized to 0. 
				Once established, you can reference elements in the array using the object's 
				methods, or using standard array index syntax (that is, using bracket notation).
				//https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array
				*/

				//AnalyserNode.getByteFrequencyData()
				/*
				The getByteFrequencyData() method of the AnalyserNode interface copies the current 
				frequency data into a Uint8Array (unsigned byte array) passed into it.
				//https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/getByteFrequencyData
				*/
				analyser.getByteFrequencyData(array);

				average = getAverageVolume(array);
				// console.log("average: "+ average);

				averageFreqBand1 = getAverageFreqBand1(array);
				averageFreqBand2 = getAverageFreqBand2(array);
				averageFreqBand3 = getAverageFreqBand3(array);
				averageFreqBand4 = getAverageFreqBand4(array);
				averageFreqBand5to7 = getAverageFreqBand5to7(array);
				
				//http://stackoverflow.com/questions/1418569/javascript-max-function-for-3-numbers
				//https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/max
				//find which audio frequency band is the highest 
				maxAudioValue = Math.max(averageFreqBand1, averageFreqBand2, averageFreqBand3, averageFreqBand4, averageFreqBand5to7);

				//console.log("highest frequency band: " + maxAudioValue);
				//1=SUBBASS, 2=BASS, 3=LOW-MIDRANGE, 
				//4=MIDRANGE, 5-7=UPPERMIDRANGE PRESENCE BRILLIANCE

				
				
				// console.log("1: " + averageFreqBand1);
				// console.log("2: " + averageFreqBand2);
				// console.log("3: " + averageFreqBand3);
				// console.log("4: " + averageFreqBand4);
				// console.log("5-7: " + averageFreqBand5to7);
				
				boost = 0;
				for (var i = 0; i < array.length; i++) {
		            boost += array[i];
		            //console.log("'array' value at position " + i + ":" + array[i]); 
		            //console.log(array[i] * 44100/256 + " Hz"); FR = 44100/256 = 172.26 Hz width. 
		            /*
		            when fftSize = 512, and there are 256 bins:

					bin 0 represents 0-172.26 Hz

					bin 1 represents 172.26-344.525 hz
					bin 2 represents 344.525-516.78 hz
					bin 3 represents 516.78-689.04 hz
					bin 4 represents 689.04-861.30 hz
					bin 5 represents 861.30-1033.56 hz

					bin 6 represents 1033.56-1205.82 hz
					bin 7 represents 1205.82-1378.08 hz
					bin 8 represents 1378.08-1550.34 hz
					bin 9 represents 1550.34-1722.60 hz
					bin 10 represents 1722.60-1894.86 hz
					
					..there are 256 bins
		            */
		            
		            //console.log(array[i] * 44100/1024 + " Hz"); FR = 44100/1024 = 43.066 Hz width. 
		            /*
		            when fftSize = 2048 and there are 1024 bins:

		            //0-60: sub-bass
		            //bin 0 to 1 represent 0 - 86.132 hz 
						bin 0 represents 0 - 43.066 hz
						bin 1 represents 43.066 - 86.132 hz

					//60-250: bass
					//bin 2 to 5 represent 86.132-258.394 hz
						bin 2 represents 86.132 - 129.198 hz
						bin 3 represents 129.198 - 172.262 hz
						bin 4 represents 172.262 - 215.328 hz
						bin 5 represents 215.328 - 258.394 hz

					//250-500: low-midrange
					//bin6-11 represent 258.394-516.79 hz
						bin 6 represents 258.394 - 301.46 hz
						bin 7 represents 301.46 - 344.526 hz
						bin 8 represents 344.526 - 387.592 hz
						bin 9 represents 387.592 - 430.658 hz
						bin10 represents 430.658 - 473.724 hz
						bin11 represents 473.724 - 516.79 hz

					//500-2000: midrange
					//bin 12-46 represent 516.79-2024.1 hz
						bin12 represents 516.79 - 559.856 hz
						bin13 602.922
						bin14 645.988
						bin15 689.054
						bin16 732.12
						bin17 775.186
						bin18 818.252
						bin19 861.318
						bin20 904.384
						bin21 947.45
						bin22 990.516
						bin23 1033.582
						bin24 1076.648
						bin25 1119.714
						bin26 1162.78
						bin27 1205.846
						bin28 1248.912
						bin29 1291.978
						bin30 1335.044
						bin31 1378.11
						bin32 1421.176
						bin33 1464.242
						bin34 1507.308
						bin35 1550.374
						bin36 1593.44
						bin37 1636.506
						bin38 1679.572
						bin39 1722.638
						bin40 1765.704
						bin41 1808.77
						bin42 1851.836
						bin43 1894.902
						bin44 1937.968
						bin45 1981.034
						bin46 2024.1
					
					//2000-20,000
					//bin 47-1024 represent 2067.166-20,000 hz
						bin47 2067.166
						bin48 
						.
						.
						.
						bin x
						.
						.
						.
						bin1024 20,000hz

					//continued until 20,000 hz, bins are divided equally
		            */

		            /* 
		            http://stackoverflow.com/questions/32782505/fft-analysis-with-javascript-how-to-find-a-specific-frequency
		            
					frequencyData is an array of amplitudes and each element of the array basically represents a range of frequencies. 
					The size of each range is defined by the sample rate divided by the number of FFT points.
					Example:
					So if your sample rate was 48000 and your FFT size is 64 then each element covers a range of 48000/64 = 750 Hz. 
					That means frequencyData[0] are the frequencies 0Hz-750Hz, frequencyData[1] is 750Hz-1500Hz, and so on.
		            */

		            /*
		            http://support.ircam.fr/docs/AudioSculpt/3.0/co/Window%20Size.html
		            
		            Let's take a 44100 sampling rate. SR=44100 Hz, F(max) = 22050 Hz.
					With a 1024 window size (512 bins), we get
						FR = 44100/1024 = 43.066
						FR = 22050/512 = 43.066
					The spectrum is equally split into 512 bins of 43.066 Hz width.

					If we choose a 4096 window size with 2048 bins, we get
						FR = 44100/4096 = 10, 76
						FR = 22050/2048 = 10,76
					The spectrum is equally split into 2048 bins of 10.76 Hz width. 

					The frequency resolution is more precise.
					*/

		        }
		        boost = boost / array.length;

				//console.log("boost: "+ boost); //average is the same as boost
			};

			$('#info') //jquery? not sure exactly what this does? fadeOut() and fadeIn(), link to soundcloud, album image
			//my assumption is that it provides information of artist, album and song with link/source to where the music was found as credit
				.fadeOut('normal', function() {
					$(this).html('<div id="artist"><a class="name" href="http://www.replusmusic.com/" target="_blank">re:plus</a><br /><a class="song" href="https://www.youtube.com/watch?v=2YQ5le2S3NM" target="_blank">Nighttime</a><br /></div><div><img src="Sound-Visualizer/data/ordinaryLandscape.jpg" width="58" /></div>');
				})
				.fadeIn();

			clearInterval(interval);

			// popup
			$('body').append($('<div onclick="play();" id="play" style="width: ' + $(window).width() + 'px; height: ' + $(window).height() + 'px;"><div id="play_link"></div></div>'));
			$('#play_link').css('top', ($(window).height() / 2 - $('#play_link').height() / 2) + 'px');
			$('#play_link').css('left', ($(window).width() / 2 - $('#play_link').width() / 2) + 'px');
			$('#play').fadeIn();
		},


		//log if an error occurs
		function(error) {
			$('#info').text('Decoding error:' + error);
		}
	);//end decodeAudioData() Method
};

request.onerror = function() {
	$('#info').text('buffer: XHR error');
};

request.send();


// ----- GET AVERAGES OF THE FREQUENCY BANDS 1,2,3,4,5-7 -----
//1=SUBBASS, 2=BASS, 3=LOW-MIDRANGE, 4=MIDRANGE, 5-7=UPPERMIDRANGE PRESENCE BRILLIANCE

//bin 0 to 1 represent 0 - 86.132 hz 
//var averageFreqBand1; //subBass, 20-60 hz
function getAverageFreqBand1(array) {
    var values = 0;
    var average;

    var binNumberStart = 0;
    var binNumberEnd = 1;
    var length = binNumberEnd-binNumberStart+1;

    // get all the frequency amplitudes
    for (var i = binNumberStart; i <= binNumberEnd; i++) {
        values += array[i];
    }

    average = values / length;
    return average;
}

//bin 2 to 5 represent 86.132-258.394 hz 
//var averageFreqBand2; //bass, 60-250 hz
function getAverageFreqBand2(array) {
    var values = 0;
    var average;

    var binNumberStart = 2;
    var binNumberEnd = 5;
    var length = binNumberEnd-binNumberStart+1;

    // get all the frequency amplitudes
    for (var i = binNumberStart; i <= binNumberEnd; i++) {
        values += array[i];
    }

    average = values / length;
    return average;
}

//bin6-11 represent 258.394-516.79 hz
//var averageFreqBand3; //lowMidRange, 250-500 hz
function getAverageFreqBand3(array) {
    var values = 0;
    var average;

    var binNumberStart = 6;
    var binNumberEnd = 11;
    var length = binNumberEnd-binNumberStart+1;

    // get all the frequency amplitudes
    for (var i = binNumberStart; i <= binNumberEnd; i++) {
        values += array[i];
    }

    average = values / length;
    return average;
}

//bin 12-46 represent 516.79-2024.1 hz
//var averageFreqBand4; //midRange, 500-2000 hz
function getAverageFreqBand4(array) {
    var values = 0;
    var average;

    var binNumberStart = 12;
    var binNumberEnd = 46;
    var length = binNumberEnd-binNumberStart+1;

    // get all the frequency amplitudes
    for (var i = binNumberStart; i <= binNumberEnd; i++) {
        values += array[i];
    }

    average = values / length;
    return average;
}

//bin 47-1024 represent 2067.166-20,000 hz
//var averageFreqBand5to7; //all three, 2000-20000 hz
//var averageFreqBand5; //upperMidRange, 2000-4000 hz
//var averageFreqBand6; //presence, 4000-6000 hz
//var averageFreqBand7; //brilliance, 6000-20000 hz
function getAverageFreqBand5to7(array) {
    var values = 0;
    var average;

    var binNumberStart = 47;
    var binNumberEnd = 1023;
    var length = binNumberEnd-binNumberStart+1;

    // get all the frequency amplitudes
    for (var i = binNumberStart; i <= binNumberEnd; i++) {
        values += array[i];
    }

    average = values / length;
    return average;
}

//returns average of all of the array values to be volume
function getAverageVolume(array) {
    var values = 0;
    var average;

    var length = array.length;

    // get all the frequency amplitudes
    for (var i = 0; i < length; i++) {
        values += array[i];
    }

    average = values / length;
    return average;
}

function displayTime(time) {
	if(time < 60) {
		return '0:' + (time < 10 ? '0' + time : time);
	}
	else {
		var minutes = Math.floor(time / 60);
		time -= minutes * 60;
		return minutes + ':' + (time < 10 ? '0' + time : time);
	}
}

function play() {
	$('#play').fadeOut('normal', function() {
		$(this).remove();
	});

	//To start playing the music, we are using the start() method.
	//AudioBufferSourceNode.start();
	source.start(0);

}

$(window).resize(function() {
	if($('#play').length === 1) {
		$('#play').width($(window).width());
		$('#play').height($(window).height());

		if($('#play_link').length === 1) {
			$('#play_link').css('top', ($(window).height() / 2 - $('#play_link').height() / 2) + 'px');
			$('#play_link').css('left', ($(window).width() / 2 - $('#play_link').width() / 2) + 'px');
		}
	}
});

