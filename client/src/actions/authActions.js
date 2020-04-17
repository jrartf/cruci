import axios from 'axios';
import Cookies from 'universal-cookie';
import jwt_decode from 'jwt-decode';

import { SET_CURRENT_USER, ERRORS_GET, SUCCESS_GET } from './types';

import { errors_clear } from './errorActions';
import { success_clear } from './successActions';
import { alert_set } from './alertActions';
import { profile_clear_current } from './profilesActions';

const cookies = new Cookies ();

// register a new user
export const user_register = (userData, history) => dispatch => {

    dispatch (errors_clear ());

    // make the request to the server
    axios.post ('/api/users/register', userData)
        .then (res => {
            history.push ('/login');
            dispatch (alert_set ('Your account has been created! - Please check your email for additional instructions', 'success', 10000));
        })
        .catch (err =>
            dispatch ({
                type: ERRORS_GET,
                payload: err.response.data
            }));

}

export const user_login = (userData) => dispatch => {

    dispatch (errors_clear ());

    axios.post ('/api/users/login', userData)
        .then (res => {
            let { token } = res.data;

            // FIXME: change production domain
            // const cookies = new Cookies ();
            process.env.NODE_ENV === "production" ?
                cookies.set ('yugen-jwt', token, {
                    path: "/", 
                    domain: ".test.com", 
                    secure: true}) :
                cookies.set ('yugen-jwt', token, {
                    path: "/", 
                    domain: ".localhost.com", 
                    maxAge: 1800,
                    secure: true});
            
            auth_token_set (token);             // set token to auth header
            let decoded = jwt_decode (token);   // decode token to get user data
            dispatch (user_set_current (decoded));  // set current user

            dispatch (alert_set (`Welcome back ${decoded.username}!`, 'success'));
        })
        .catch (err =>
            dispatch ({
                type: ERRORS_GET,
                payload: err.response.data
            }));

};

// set logged user
export const user_set_current = (decoded) => {

    return {
        type: SET_CURRENT_USER,
        payload: decoded
    }

}

// log user out
export const user_logout = () => dispatch => {

    // FIXME: change production domain
    // const cookies = new Cookies ();
    process.env.NODE_ENV === "production" ?
        cookies.remove ('yugen-jwt', {
            path: "/", 
            domain: ".test.com"}) :
        cookies.remove ('yugen-jwt', {
            path: "/", 
            domain: ".localhost.com"});
    
    // remove auth header for future requests
    auth_token_set (null);
    dispatch (user_set_current ({}));
    dispatch (alert_set ('You have logged out!', 'success'));

};

// user has enter a confirmation link to finish setting up account
export const user_confirmation = (email, token) => dispatch => {

    dispatch (errors_clear ());
    dispatch (success_clear ());

    if (email && token) {
        let data = { "email": email, "token": token };

        axios.post ('/api/users/confirmation', data)
            .then (res => {
                // console.log (res.data);
                dispatch ({
                    type: SUCCESS_GET,
                    payload: res.data
                });
            })
            .catch (err => 
                dispatch ({
                    type: ERRORS_GET,
                    payload: err.response.data
                }));
    }

    else dispatch ({ type: ERRORS_GET, payload: {"link": "bad link"} });

}

// submit request for a lost password
export const password_forgot = (data) => dispatch => {

    dispatch (errors_clear ());
    dispatch (success_clear ());

    axios.post ('/api/users/forgot', data)
        .then (res => {
            dispatch (alert_set (`Instructions for password reset have been sent to ${data.email}`, 'success'));
            dispatch ({
                type: SUCCESS_GET,
                payload: {"success": "success"}
            });
        })
        .catch (err => 
            dispatch ({
                type: ERRORS_GET,
                payload: err.response.data
            }));

}

// reset a password
export const password_reset = (reset, history) => dispatch => {
    
    dispatch (errors_clear ());
    dispatch (success_clear ());

    let data = {
        password: reset.password,
        password2: reset.password2
    }

    axios.post (`/api/users/reset/${reset.token}`, data)
        .then (res => {
            history.push ('/login');
            dispatch (alert_set ('Password has been reset!', 'success'));
            // dispatch ({
            //     type: SUCCESS_GET,
            //     payload: {"success": "success"}
            // });
        })
        .catch (err => 
            dispatch ({
                type: ERRORS_GET,
                payload: err.response.data
            }));

}

// check for user token
export const user_token_check = (store) => {

    // const cookies = new Cookies ();
    let jwt = cookies.get ("yugen-jwt");

    // localStorage.jwtToken
    if (jwt) {
        // decode token and get user info
        // let decoded = jwt_decode (localStorage.jwtToken);
        // check for expired token
        let decoded = jwt_decode (jwt);
        let currentTime = Date.now () / 1000;
        if (decoded.exp < currentTime) {
            // logout the user
            store.dispatch (user_logout ());
            store.dispatch (profile_clear_current ());
    
            // redirect to the landing page
            window.location.href = '/';
        }

        else {
            auth_token_set (jwt);           // set auth token header auth
            store.dispatch (user_set_current (decoded));
        }
    }

}

// set auth token for each request
const auth_token_set = token => {

	// Apply to every request
	if (token) axios.defaults.headers.common['Authorization'] = token;
	else delete axios.defaults.headers.common['Authorization'];
	
};