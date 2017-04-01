/* global Module */

/* Magic Mirror
 * Module: MMM-NBA-Standings
 *
 * MIT Licensed.
 */

var request = require('request');
var NodeHelper = require('node_helper');
var _ = require('lodash');

// Responsible for pulling NBA standings data from the API for configured module(s).
module.exports = NodeHelper.create({
	config: {
		apiUrl: 'https://erikberg.com/nba/standings.json',
		// erikberg.com API rate limits 3 requests per hour, 1 request per 20 minutes. 
		// Pull every 21 minutes to stay on the rate limiter's good side.
		refreshTime: 21 * 60 * 1000
	},

	refreshInterval: null,
	nbaStandings: {},
	
	// Initialize standings data, schedule data refresh interval.
	start: function () {
		console.log('Starting node helper for: ' + this.name);

		this.fetchStandings();
		this.scheduleRefreshInterval();
	},

	scheduleRefreshInterval: function () {
		clearInterval(this.refreshInterval);

		var self = this;
		this.refreshInterval = setInterval(function() {
			self.fetchStandings();
		},
		this.config.refreshTime);
	},

	fetchStandings: function() {
		var requestOptions = { 
			url: this.config.apiUrl, 
			method: 'GET',
			headers: {
				'User-Agent' : 'mmm-nba-standings/0.0.1 request'
			}
		};

		console.log('Fetching NBA Standings from ' + requestOptions.url);

		var self = this;
		request(requestOptions, function(error, response, body) {
			if(!error && response.statusCode === 200) {
				self.onFetchStandingsSuccess(body);
			}
			else {
				self.onFetchStandingsError(error, response, body);
			}
		});
	},

	// Update our standings data and notify consumers with new data.
	onFetchStandingsSuccess: function(nbaStandingsJSON) {
		console.log('API call to fetch NBA Standings succeeded.');

		this.nbaStandings = this.convertNBAStandingsJSON(nbaStandingsJSON);

		this.sendUpdateStandingsSocketNotification(this.nbaStandings);
	},

	// convert the API response into the module's NBA standings DTO.
	convertNBAStandingsJSON: function(nbaStandingsJSON) {
		var nbaStandingsDto = JSON.parse(nbaStandingsJSON);

		var standingsByConference = _.groupBy(nbaStandingsDto["standing"], function(team_standing) {
		 	return team_standing["conference"]; 
		});

		var nbaStandings = {
			lastUpdated: nbaStandingsDto["standings_date"],
			leagueStandings: standingsByConference
		};

		return nbaStandings;
	},

	sendUpdateStandingsSocketNotification: function(nbaStandings) {
		this.sendSocketNotification('SET_NBA_STANDINGS', nbaStandings);
	},

	onFetchStandingsError: function(error, response, body) {
		console.error('API call to fetch NBA standings failed.');
		console.error('error: ', error);
		console.error('statusCode: ', response && response.statusCode);
		console.error('body: ', body);
	},

	// When new clients connect, trigger a standings data update notification.
	// This sync notification is how the module bootstraps its standings data.
	socketNotificationReceived: function(notification, payload) {
		if(notification === 'SYNC_NEW_CLIENT') {
			this.sendUpdateStandingsSocketNotification(this.nbaStandings);
		}
	}
});