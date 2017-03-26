var request = require('request');
var NodeHelper = require('node_helper');
var _ = require('lodash');

module.exports = NodeHelper.create({
	config: {
		refreshTime: 5 * 60 * 1000, // 5 minutes
		apiUrl: 'http://localhost:7878/nba/standings.json' // 'https://erikberg.com/nba/standings.json'
	},

	refreshInterval: null,
	nbaStandings: {},
	
	// Override start method.
	start: function () {
		console.log('Starting node helper for: ' + this.name);
		this.scheduleRefreshInterval();
	},

	scheduleRefreshInterval: function () {
		clearInterval(this.refreshInterval);

		var self = this;
		this.refreshInterval = setInterval(function() {
			self.fetchStandings();
		},
		this.config.refreshTime);

		this.fetchStandings();
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

	onFetchStandingsSuccess: function(nbaStandingsJSON) {
		console.log('API call to fetch NBA Standings succeeded.');

		this.nbaStandings = this.convertNBAStandingsJSON(nbaStandingsJSON);

		this.sendUpdateStandingsSocketNotification(this.nbaStandings);
	},

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

	socketNotificationReceived: function(notification, payload) {
		if(notification === 'SYNC_NEW_CLIENT') {
			this.sendUpdateStandingsSocketNotification(this.nbaStandings);
		}
	}
});