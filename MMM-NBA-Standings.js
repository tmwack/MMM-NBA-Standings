/* global Module */

/* Magic Mirror
 * Module: MMM-NBA-Standings
 *
 * MIT Licensed.
 */

Module.register('MMM-NBA-Standings', {
    defaults: {
        // API allows 6 requests within a 4 hour window. 6 req / 4hr = 1 req / 20 min. 
        // Added a minute to ensure we stay on the rate limiter's good side.
        refreshIntervalInMinutes: 21,

        // The conference standings to display. Values: ['EAST', 'WEST'].
        conference: 'EAST'
    },

    requiresVersion: "2.1.0",

    getStyles: function() {
        return ['standings.css'];
    },

    // Initialize nbaStandings to null, sync client with module's server-side node_helper.
    start: function() {
        Log.info('Starting module: ' + this.name);

        this.nbaStandings = null;

        /* The purpose of this socket notification is two-fold: 
        *       (1) Tells server-side node_helper that we exist and should be sent notifications.
        *       (2) Trigger immediate 'SET_NBA_STANDINGS' socket notification from node_helper w/ the most recently
        *           fetched NBA Standings data.
        *   
        *   Not happy with either of these purposes -- feels hacky. I don't seem to have power over (1), as google 
        *     and S/O suggest. (2), however, is probably my fault. It could be inherent to 'serveronly', or it could 
        *     just be The Way It Works. If I have no power over (2), then at least we've cached the update and isolated 
        *     this as a bootstrapping problem.
        */
        this.sendSocketNotification('SYNC_NEW_CLIENT', {});
    },

    // 
    socketNotificationReceived: function(notification, payload) {
        if(notification === 'SET_NBA_STANDINGS') {
            this.nbaConferenceStandings = this.parseSetStandingsPayload(payload);
            this.updateDom(1000);
        }
    },

    parseSetStandingsPayload: function(nbaStandings) {
        var conferenceName;
        var conferenceStandings;
        if(this.config.conference === 'EAST') {
            conferenceName = 'Eastern Conference';
            conferenceStandings = nbaStandings.leagueStandings.EAST;
        } else {
            if(this.config.conference === 'WEST') {
                conferenceName = 'Western Conference';
                conferenceStandings = nbaStandings.leagueStandings.WEST;
            }
            else {
                Log.error('Unable to parse configured conference from NBA Standings update. Things are about to get weird.');
            }
        }

        var lastUpdated = nbaStandings.lastUpdated.replace('T00:', ' '); // naive ISO-8601 formatting.
        lastUpdated = lastUpdated.replace('-04:00', ''); // super stupid way to strip the offset.

        return {
            conferenceName: conferenceName,
            standings: conferenceStandings,
            lastUpdated: lastUpdated
        };
    },

    // Override dom generator.
    getDom: function() {
        Log.info(this.nbaConferenceStandings);

        var wrapper = null;
        if(this.nbaConferenceStandings) {
            wrapper = this.getNBAStandingsDom(this.nbaConferenceStandings);
        } else {
            wrapper = this.getNoStandingsDom();
        }

        return wrapper;
    },

    getNBAStandingsDom: function(nbaConferenceStandings) {
        var wrapper = document.createElement('div');
        wrapper.className = 'standings-container';

        var conferenceNameRow = this.getConferenceNameRowDom(nbaConferenceStandings.conferenceName)
        wrapper.appendChild(conferenceNameRow);

        var conferenceStandingsRow = this.getTeamStandingsRowDom(nbaConferenceStandings.standings);
        wrapper.appendChild(conferenceStandingsRow);

        var lastUpdatedRow = this.getStandingsLastUpdatedRowDom(nbaConferenceStandings.lastUpdated);
        wrapper.appendChild(lastUpdatedRow);

        return wrapper;
    },

    getConferenceNameRowDom: function(conferenceName) {
        var conferenceNameRow = document.createElement('div');
        conferenceNameRow.className = 'standings-container-row';

        var conferenceNameCell = document.createElement('div');
        conferenceNameCell.className = 'standings-container-cell medium';
        conferenceNameCell.innerHTML = conferenceName;
        conferenceNameRow.appendChild(conferenceNameCell);

        return conferenceNameRow;
    },

    getStandingsLastUpdatedRowDom: function(lastUpdated) {
        var lastUpdatedRow = document.createElement('div');
        lastUpdatedRow.className = 'standings-container-row';

        var lastUpdatedCell = document.createElement('div');
        lastUpdatedCell.className = 'standings-container-cell xsmall light';
        lastUpdatedCell.innerHTML = 'Last updated: ' + lastUpdated;
        lastUpdatedRow.appendChild(lastUpdatedCell);

        return lastUpdatedRow;
    },

    getTeamStandingsRowDom: function(teamStandings) {    
        var standingsRow = document.createElement('div');
        standingsRow.className = 'standings-container-row';

        var standingsCell = document.createElement('div');
        standingsCell.className = 'standings-container-cell';
        standingsRow.appendChild(standingsCell);

        var conferenceStandingsTable = this.getTeamStandingsTableDom(teamStandings);
        standingsCell.appendChild(conferenceStandingsTable);        

        return standingsRow;
    },

    getTeamStandingsTableDom: function(teamStandings) {
        var standingsTable = document.createElement('table');

        var standingsTableHeaderRow = this.getTeamStandingHeaderRowDom();
        standingsTable.appendChild(standingsTableHeaderRow);

        var self = this;
        teamStandings.forEach(function(teamStanding) {
            var teamStandingRow = self.getTeamStandingRowDom(teamStanding);

            standingsTable.appendChild(teamStandingRow);
        });

        return standingsTable;
    },

    getTeamStandingHeaderRowDom: function() {
        var teamStandingHeaderRow = document.createElement('tr');
        teamStandingHeaderRow.className = 'standings-team-header-row';

        var rankHeaderCell = this.getTeamStandingHeaderCellDom('Rank');
        teamStandingHeaderRow.appendChild(rankHeaderCell);

        var teamNameHeaderCell = this.getTeamStandingHeaderCellDom('Team');
        teamStandingHeaderRow.appendChild(teamNameHeaderCell);

        var gamesBackHeaderCell = this.getTeamStandingHeaderCellDom('GB');
        teamStandingHeaderRow.appendChild(gamesBackHeaderCell);

        var lastTenHeaderCell = this.getTeamStandingHeaderCellDom('L10');
        teamStandingHeaderRow.appendChild(lastTenHeaderCell);

        return teamStandingHeaderRow;
    },

    getTeamStandingHeaderCellDom: function(columnName) {
        var teamStandingHeaderCell = document.createElement('th');
        teamStandingHeaderCell.className = 'small';
        teamStandingHeaderCell.innerHTML = columnName;

        return teamStandingHeaderCell;
    },

    getTeamStandingRowDom: function(teamStanding) {
        var teamStandingRow = document.createElement("tr");
        teamStandingRow.className = 'standings-team-row';

        var rankCell = document.createElement('td');
        rankCell.innerHTML = teamStanding.rank;
        rankCell.className = 'standings-team-rank small';
        teamStandingRow.appendChild(rankCell);

        var teamNameCell = document.createElement('td');
        teamNameCell.innerHTML = teamStanding.first_name + ' ' + teamStanding.last_name;
        teamNameCell.className = 'standings-team-name small';
        teamStandingRow.appendChild(teamNameCell);

        var gamesBackCell = document.createElement('td');
        gamesBackCell.innerHTML = teamStanding.games_back;
        gamesBackCell.className = 'standings-team-gamesBack small';
        teamStandingRow.appendChild(gamesBackCell);

        var lastTenCell = document.createElement('td');
        lastTenCell.innerHTML = teamStanding.last_ten;
        lastTenCell.className = 'standings-team-lastTen small';
        teamStandingRow.appendChild(lastTenCell);

        return teamStandingRow;
    },

    getNoStandingsDom: function() {
        Log.info('no standings data, bailing early');

        var wrapper = document.createElement('table');
        wrapper.innerHTML = "No standings data...";
        wrapper.className = 'normal';

        return wrapper;
    }
 });