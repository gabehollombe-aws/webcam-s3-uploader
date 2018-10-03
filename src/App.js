import React, { Component } from 'react';
import Webcam from 'react-webcam';
import Amplify, { Auth } from 'aws-amplify';
import { S3Image } from 'aws-amplify-react';
import AWS from 'aws-sdk';
import { v4 as uuid } from 'uuid';
import { Form, Image } from 'semantic-ui-react';
import aws_exports from './aws-exports';
Amplify.configure(aws_exports);

const S3 = async () => {
  const credentials = await Auth.currentCredentials();
  return new AWS.S3({
    apiVersion: '2013-04-01',
    credentials: Auth.essentialCredentials(credentials)
  });
}

const uploadImageToS3 = async (imgSrc, pathPrefix) => {
  const base64Data = new Buffer(imgSrc.replace(/^data:image\/\w+;base64,/, ""), 'base64')
  const type = imgSrc.split(';')[0].split('/')[1]
  const extension = type === 'jpeg' ? 'jpg' : type;

  const params = {
    Bucket: aws_exports.aws_user_files_s3_bucket,
    Key: `${pathPrefix}/${uuid()}.${extension}`,
    Body: base64Data,
    ContentEncoding: 'base64',
    ContentType: `image/${type}`
  }

  const s3 = await S3();
  await s3.upload(params).promise();
  return params.Key;
}

const removeImageFromS3 = async (key) => {
  const s3 = await S3();
  return s3.deleteObject({
    Bucket: aws_exports.aws_user_files_s3_bucket,
    Key: key
  }).promise()
}

const getImageKeys = async (datasetName, label) => {
  const s3 = await S3();
  const result = await s3.listObjectsV2({
    Bucket: aws_exports.aws_user_files_s3_bucket,
    Prefix: `public/${datasetName}/${label}/`,
  }).promise();
  return result.Contents.map(o => o.Key);
}

class WebcamCapture extends React.Component {
  setRef = webcam => {
    this.webcam = webcam;
  };

  handleCapture = () => {
    const imageSrc = this.webcam.getScreenshot();
    this.props.onCapture(imageSrc);
  };

  handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      this.handleCapture();
    }
  }

  componentWillMount = () => {
    document.addEventListener("keydown", this.handleKeyDown);
  }

  render() {
    const videoConstraints = {
      width: 224,
      height: 224,
      facingMode: "user"
    };

    return (
      <div>
        <h3>Press Enter to add webcam capture</h3>
        <div>
          <Webcam
            audio={false}
            height={224}
            ref={this.setRef}
            screenshotFormat="image/jpeg"
            screenshotWidth={224} // no sense capturing images in a resolution higher than what resnet wants
            width={224}
            videoConstraints={videoConstraints}
          />
        </div>
      </div>
    );
  }
}

class ImageWrapper extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    if (this.props.src) return <Image src={this.props.src} onDoubleClick={this.props.onDoubleClick} />;
    return (
      <div style={{display: 'inline-block'}} onDoubleClick={this.props.onDoubleClick} >
        <S3Image style={{display: 'inline-block', margin: '0 .25rem'}} imgKey={this.props.imgKey.replace(/^public\//, '')}/>
      </div>
    )
  }
}

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      datasetName: '',
      label: '',
      fetching: false,
      totalUploads: 0,
      uploadsCompleted: 0,
      existingImageKeys: [],
      uploadedImages:{}
    };
  }

  fetchImageKeys = async (datasetName, label) => {
    if (datasetName === '') return;

    this.setState({
      fetching: true
    });

    const existingImageKeys = await getImageKeys(datasetName, label);
    this.setState({ 
      existingImageKeys, 
      fetching: false
    })
  }

  handleChange = (e) => this.setState({ [e.target.name]: e.target.value })

  handleLabelBlur = (e) => {
    this.fetchImageKeys(this.state.datasetName, e.target.value);
    this.setState({
      uploadedImages: {}
    });
  }

  handleImageDoubleClick = (key) => {
    removeImageFromS3(key);

    const updatedUploadedImages = Object.assign(this.state.uploadedImages, {});
    delete updatedUploadedImages[key];

    const updatedExistingImageKeys = this.state.existingImageKeys.filter(k => k !== key);

    this.setState({
      uploadedImages: updatedUploadedImages,
      existingImageKeys: updatedExistingImageKeys,
    });
  }

  upload = async (imageSrc) => {
    if (this.state.label === '') return;

    const imageKey = await uploadImageToS3(imageSrc, `public/${this.state.datasetName}/${this.state.label}`);

    this.setState({
      totalUploads: this.state.totalUploads + 1
    });
    this.setState({
      uploadsCompleted: this.state.uploadsCompleted + 1,
      uploadedImages: { ...this.state.uploadedImages, ...{[imageKey]: imageSrc} }
    });
  }

  render() {
    const UploadStatus = () => {
      return (
        <div>
          Uploaded {this.state.uploadsCompleted} of {this.state.totalUploads}
        </div>
      )
    }

    return (
      <div>
        <h2>Managing photos inside s3://{aws_exports.aws_user_files_s3_bucket}/{this.state.datasetName}/{this.state.label}/</h2>
        <Form>
          <Form.Group widths='equal'>
            <Form.Input label='Dataset Name' placeholder='Dataset Name' name='datasetName' onChange={this.handleChange} />
            <Form.Input label='Label' placeholder='Label' name='label' onChange={this.handleChange} onBlur={this.handleLabelBlur} />
          </Form.Group>
          
          <WebcamCapture onCapture={this.upload} disabled={this.state.label === ''}/>
        </Form>

        {/* <UploadStatus /> */}

        { (this.state.existingImageKeys.length > 0 || Object.keys(this.state.uploadedImages).length > 0)
          ? <h3>Double-click an image to remove it</h3>
          : null
        }

        <Image.Group size='tiny'>
          { 
            this.state.fetching
            ? <h3>Loading existing images...</h3>
            : this.state.existingImageKeys.map(key => <ImageWrapper key={key} imgKey={key} onDoubleClick={this.handleImageDoubleClick.bind(this, key)} />)
          }
        </Image.Group>

        <Image.Group size='tiny'>
          { Object.keys(this.state.uploadedImages).map(key => <ImageWrapper key={key} src={this.state.uploadedImages[key]} onDoubleClick={this.handleImageDoubleClick.bind(this, key)} />) }
        </Image.Group>
      </div>
    );
  }
}

export default App;
