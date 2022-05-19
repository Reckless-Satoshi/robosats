import React, { Component } from "react";
import { withTranslation } from "react-i18next";
import { Button , Tooltip, Grid, Typography, TextField, ButtonGroup, CircularProgress, IconButton} from "@mui/material"
import { Link } from 'react-router-dom'
import Image from 'material-ui-image'
import { InfoDialog } from './Dialogs'

import SmartToyIcon from '@mui/icons-material/SmartToy';
import CasinoIcon from '@mui/icons-material/Casino';
import ContentCopy from "@mui/icons-material/ContentCopy";
import BoltIcon from '@mui/icons-material/Bolt';
import { RoboSatsNoTextIcon } from "./Icons";

import { getCookie, writeCookie } from "../utils/cookies";

class UserGenPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      openInfo: false,
      tokenHasChanged: false,
      token: ""
    };

    this.refCode = this.props.match.params.refCode;
  }

  componentDidMount() {
    // Checks in parent HomePage if there is already a nick and token
    // Displays the existing one
    if (this.props.nickname != null){
      this.setState({
        nickname: this.props.nickname,
        token: this.props.token? this.props.token : "",
        avatar_url: '/static/assets/avatars/' + this.props.nickname + '.png',
        loadingRobot: false
      });
    }
    else{
      var newToken = this.genBase62Token(36)
      this.setState({
        token: newToken
      });
      this.getGeneratedUser(newToken);
    }
  }

  // sort of cryptographically strong function to generate Base62 token client-side
  genBase62Token(length)
  {
      return window.btoa(Array.from(
        window.crypto.getRandomValues(
          new Uint8Array(length * 2)))
          .map((b) => String.fromCharCode(b))
          .join("")).replace(/[+/]/g, "")
          .substring(0, length);
  }

  getGeneratedUser=(token)=>{
    fetch('/api/user' + '?token=' + token + '&ref_code=' + this.refCode)
      .then((response) => response.json())
      .then((data) => {
        this.setState({
            nickname: data.nickname,
            bit_entropy: data.token_bits_entropy,
            avatar_url: '/static/assets/avatars/' + data.nickname + '.png',
            shannon_entropy: data.token_shannon_entropy,
            bad_request: data.bad_request,
            found: data.found,
            loadingRobot:false,
        })
        &
        // Add nick and token to App state (token only if not a bad request)
        (data.bad_request ? this.props.setAppState({
          nickname: data.nickname,
          avatarLoaded: false,
        })
        :
        (this.props.setAppState({
          nickname: data.nickname,
          token: token,
          avatarLoaded: false,
        })) & writeCookie("robot_token",token))
        &
        // If the robot has been found (recovered) we assume the token is backed up
        (data.found ? this.props.setAppState({copiedToken:true}) : null)
     });
  }

  delGeneratedUser() {
    const requestOptions = {
      method: 'DELETE',
      headers: {'Content-Type':'application/json', 'X-CSRFToken': getCookie('csrftoken')},
    };
    fetch("/api/user", requestOptions)
      .then((response) => response.json());
  }

  handleClickNewRandomToken=()=>{
    var token = this.genBase62Token(36);
    this.setState({
      token: token,
      tokenHasChanged: true,
    });
    this.props.setAppState({copiedToken: true})
  }

  handleChangeToken=(e)=>{
    this.setState({
      token: e.target.value,
      tokenHasChanged: true,
    })
  }

  handleClickSubmitToken=()=>{
    this.delGeneratedUser();
    this.getGeneratedUser(this.state.token);
    this.setState({loadingRobot: true, tokenHasChanged: false});
    this.props.setAppState({avatarLoaded: false, nickname: null, token: null, copiedToken: false});
  }

  handleClickOpenInfo = () => {
    this.setState({openInfo: true});
  };

  handleCloseInfo = () => {
    this.setState({openInfo: false});
  };

  render() {
    const { t, i18n} = this.props;
    return (
      <Grid container spacing={1}>
        <Grid item>
          <div className='clickTrough'/>
        </Grid>
        <Grid item xs={12} align="center" sx={{width:370, height:260}}>
          {!this.state.loadingRobot ?
            <div>
              <Grid item xs={12} align="center">
                <Typography component="h5" variant="h5">
                  <b>{this.state.nickname ?
                    <div style={{display:'flex', alignItems:'center', justifyContent:'center', flexWrap:'wrap', height:'45px'}}>
                      <BoltIcon sx={{ color: "#fcba03", height: '33px',width: '33px'}}/><a>{this.state.nickname}</a><BoltIcon sx={{ color: "#fcba03", height: '33px',width: '33px'}}/>
                    </div>
                    : ""}</b>
                </Typography>
              </Grid>
              <Grid item xs={12} align="center">
              <Tooltip enterTouchDelay={0} title={t("This is your trading avatar")}>
                <div style={{ maxWidth: 200, maxHeight: 200 }}>
                  <Image className='newAvatar'
                    disableError={true}
                    cover={true}
                    color='null'
                    src={this.state.avatar_url || ""}
                  />
                </div>
                </Tooltip><br/>
              </Grid>
            </div>
            : <CircularProgress sx={{position: 'relative', top: 100, }}/>}
          </Grid>
          {
            this.state.found ?
              <Grid item xs={12} align="center">
                <Typography component="subtitle2" variant="subtitle2" color='primary'>
                  {this.state.found ? t("A robot avatar was found, welcome back!"):null}<br/>
                </Typography>
              </Grid>
             :
             ""
          }
          <Grid container align="center">
            <Grid item xs={12} align="center">
              <TextField sx={{maxWidth: 280}}
                error={this.state.bad_request}
                label={t("Store your token safely")}
                required={true}
                value={this.state.token}
                variant='standard'
                helperText={this.state.bad_request}
                size='small'
                onChange={this.handleChangeToken}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    this.handleClickSubmitToken();
                  }
                }}
                InputProps={{
                  startAdornment:
                  <Tooltip disableHoverListener enterTouchDelay={0} title={t("Copied!")}>
                    <IconButton  onClick= {()=> (navigator.clipboard.writeText(this.state.token) & this.props.setAppState({copiedToken:true}))}>
                      <ContentCopy color={this.props.avatarLoaded & !this.props.copiedToken & !this.state.bad_request ? 'primary' : 'inherit' } sx={{width:18, height:18}}/>
                    </IconButton>
                  </Tooltip>,
                  endAdornment:
                  <Tooltip enterTouchDelay={250} title={t("Generate a new token")}>
                    <IconButton onClick={this.handleClickNewRandomToken}><CasinoIcon/></IconButton>
                  </Tooltip>,
                  }}
              />
            </Grid>
          </Grid>
          <Grid item xs={12} align="center">
            {this.state.tokenHasChanged ?
            <Button type="submit" size='small'  onClick= {this.handleClickSubmitToken}>
              <SmartToyIcon sx={{width:18, height:18}} />
              <span> {t("Generate Robot")}</span>
            </Button>
            :
            <Tooltip enterTouchDelay={0} enterDelay={500} enterNextDelay={2000} title={t("You must enter a new token first")}>
              <div>
              <Button disabled={true} type="submit" size='small' >
                <SmartToyIcon sx={{width:18, height:18}} />
                <span>{t("Generate Robot")}</span>
              </Button>
              </div>
            </Tooltip>
            }
          </Grid>
          <Grid item xs={12} align="center">
            <ButtonGroup variant="contained" aria-label="outlined primary button group">
              <Button disabled={this.state.loadingRobot} color='primary' to='/make/' component={Link}>{t("Make Order")}</Button>
              <Button color='inherit' style={{color: '#111111'}} onClick={this.handleClickOpenInfo}>{t("Info")}</Button>
              <InfoDialog open={Boolean(this.state.openInfo)} onClose = {this.handleCloseInfo}/>
              <Button disabled={this.state.loadingRobot} color='secondary' to='/book/' component={Link}>{t("View Book")}</Button>
            </ButtonGroup>
          </Grid>

          <Grid item xs={12} align="center" sx={{width:370}}>
            <Grid item>
              <div style={{height:40}}/>
            </Grid>
            <div style={{width:370, left:30}}>
              <Grid container align="center">
                <Grid item xs={0.8}/>
                <Grid item xs={7.5} align="right">
                  <Typography component="h5" variant="h5">
                     {t("Simple and Private LN P2P Exchange")}
                  </Typography>
                </Grid>
                <Grid item xs={2.5} align="left">
                    <RoboSatsNoTextIcon color="primary" sx={{height:72, width:72}}/>
                </Grid>
              </Grid>
            </div>
          </Grid>
      </Grid>
    );
  }
}

export default withTranslation()(UserGenPage);
