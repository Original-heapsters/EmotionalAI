import os
import re
import subprocess
import split_audio as spa
import audio2spec_scipy2 as a2s
import img_concat as imcat
from ffprobe3 import FFProbe

class VideoOperations:

    def __init__(self, desiredFrames, inputVideo, outputPath, outputAudio, duration=0.0):
        self.desiredFrames = desiredFrames
        self.inputVideo = inputVideo
        self.outputPath = outputPath
        self.outputAudio = outputAudio
        self.duration = duration

    def getVideoFrames(self):
        # Split video into it corresponding parts based on self.desiredFrames
        print(self.inputVideo)
        metadata = FFProbe(self.inputVideo)
        print(metadata)
        # if len(metadata.streams) != 2:
        #
        #  continue
        #duration = metadata.audio[0].duration_seconds()
        duration = self.getLength()
        self.duration = duration
        print(duration)
        # try:
        #     duration = metadata.audio[0].duration_seconds()
        # except:
        #     pass
        timestep = float(duration)/self.desiredFrames
        print (duration,timestep)
        print (self.inputVideo)
        cmd = 'ffmpeg -i ' + self.inputVideo + '  '+self.outputPath+'$filename%04d.jpg'
        os.system(cmd)

        if os.path.exists(self.outputAudio + 'audio.wav'):
            os.remove(self.outputAudio + 'audio.wav')
        cmd2 = 'ffmpeg -i ' + self.inputVideo + ' ' + self.outputAudio + 'audio.wav'
        os.system(cmd2)
        #import pdb; pdb.set_trace()
        # os.system("ffmpeg -i %s %s" % (self.inputVideo, self.outputPath))
        return True

    def getChunks(self, videoFramesDir):
        # try:
        #     assert len(videoFramesDir) >= self.desiredFrames
        # except:
        #     return []

        # Get the number to skip between iterations.
        input_list = self.sorted_ls(videoFramesDir)
        skip = len(input_list) // self.desiredFrames

        print('skip = ' + str(skip))


        # Build our new output.
        output = [input_list[i] for i in range(0, len(input_list), skip)]
        print(output)

        counter = 0
        for vidFrame in self.sorted_ls(videoFramesDir):
            if counter >= self.desiredFrames:
                print('Removing '+videoFramesDir + vidFrame)
                os.remove(videoFramesDir + vidFrame)
            else:
                if vidFrame not in output:
                    print('Removing '+videoFramesDir + vidFrame)
                    os.remove(videoFramesDir + vidFrame)
                else:
                    counter += 1

        count = 0000
        for vidFrame in self.sorted_ls(videoFramesDir):
            os.system('mv ' + os.path.join(self.outputPath,vidFrame) + ' ' +  os.path.join(self.outputPath,str(count)+'.jpg'))
            count += 1



        # Cut off the last one if needed.
        return output[:self.desiredFrames]

    def getAudio(self):
        os.system('rm ' + self.outputAudio + '../AudioFull/*.wav')
        os.system('rm ' + self.outputAudio + '../AudioSpec/*.png')
        spa.split(self.outputAudio + 'audio.wav',self.outputAudio + '../AudioFull/',timestep=(self.duration/self.desiredFrames)*1000)
        count = 0000
        for audioFrame in self.sorted_ls(self.outputAudio + '../AudioFull/'):
            os.system('mv ' + os.path.join(self.outputAudio + '../AudioFull/',audioFrame) + ' ' +  os.path.join(self.outputAudio + '../AudioFull/'+str(count)+'.wav'))
            count += 1
        return True

    def generateSpectroShizz(self):
        output = self.outputAudio + '../AVMerge/'
        os.system('rm ' + output + '*.jpg')
        for wf in self.sorted_ls(self.outputAudio + '../AudioFull'):
            wf = os.path.join(self.outputAudio + '../AudioFull', wf)
            #a2s.graph_spectrogram(wf,dest4+os.path.basename(wf).split('.')[0])
            a2s.plotstft(wf, plotpath=self.outputAudio + '../AudioSpec/' + os.path.basename(wf).split('.')[0])
            imcat.concat(self.outputPath+os.path.basename(wf).split('.')[0]+'.jpg',\
                         self.outputAudio + '../AudioSpec/'+os.path.basename(wf).split('.')[0]+'.png',\
                         output+'00'+os.path.basename(wf).split('.')[0])

    def getLength(self):
        duration = subprocess.check_output(['ffprobe', '-i', self.inputVideo, '-show_entries', 'format=duration', '-v', 'quiet', '-of', 'csv=%s' % ("p=0")])
        print('DURATION: ' + str(float(duration)))

        #print(durations)
        return float(duration)

    def sorted_ls(self,path):
        mtime = lambda f: os.stat(os.path.join(path, f)).st_mtime
        return list(sorted(os.listdir(path), key=mtime))
