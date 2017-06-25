from keras.preprocessing.image import ImageDataGenerator, array_to_img, img_to_array, load_img
import numpy as np
import scipy.misc as sc
#from keras.applications.inception_v3 import InceptionV3, preprocess_input

def concat(img1,img2,outname,targetsize=(149,299)):
    img1 = load_img(img1, target_size=targetsize)
    img2 = load_img(img2, target_size=targetsize)
    x = img_to_array(img1)
    y = img_to_array(img2)
    z = np.vstack((x,y))
    #z = np.expand_dims(z, axis=0)
    sc.imsave('%s.jpg'%outname,z)

if __name__ == '__main__':
    concat('./train/imgs/ApplyEyeMakeup/v_ApplyEyeMakeup_g08_c01-0001.jpg',\
           './train/specs/ApplyEyeMakeup/v_ApplyEyeMakeup_g08_c01-0001.png', \
           'out',targetsize=(180,360))
