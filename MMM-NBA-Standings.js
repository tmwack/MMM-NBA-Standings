/* global Module */

/* Magic Mirror
 * Module: MMM-NBA-Standings
 *
 * MIT Licensed.
 */

// Displays NBA standings data for a conference.
Module.register('MMM-NBA-Standings', {
    defaults: {
        // The conference standings to display. Values: ['EAST', 'WEST'].
        conference: 'EAST'
    },

    requiresVersion: "2.1.0",

    getScripts: function() {
        return ["moment.js"];
    },

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

    // Handles notifications from the node_helper.
    socketNotificationReceived: function(notification, payload) {
        if(notification === 'SET_NBA_STANDINGS') {
            this.nbaConferenceStandings = this.parseSetStandingsPayload(payload);
            this.updateDom(1000);
        }
    },

    // Parse NBA Standings data pushed from the node_helper. 
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

        var lastUpdated = moment(nbaStandings.lastUpdated);

        return {
            conferenceName: conferenceName,
            standings: conferenceStandings,
            lastUpdated: lastUpdated
        };
    },

    // Override dom generator.
    getDom: function() {
        var wrapper = null;
        if(this.nbaConferenceStandings) {
            wrapper = this.getNBAStandingsDom(this.nbaConferenceStandings);
        } else {
            wrapper = this.getNoStandingsDom();
        }

        return wrapper;
    },

    // Create the module DOM from NBA conference standings data.
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

    // Create the header row, displaying the name of the conference.
    getConferenceNameRowDom: function(conferenceName) {
        var conferenceNameRow = document.createElement('div');
        conferenceNameRow.className = 'standings-container-row';

        var conferenceNameCell = document.createElement('div');
        conferenceNameCell.className = 'standings-container-header medium';
        conferenceNameCell.innerHTML = conferenceName;
        conferenceNameRow.appendChild(conferenceNameCell);

        return conferenceNameRow;
    },

    // Create the team standings row, displaying conference standings as a table.
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

    // Create the table containing conference standings, one team per row.
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

    // Create the header row for the team standings table, describing each column.
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

    // Create a header cell for the team standings table header.
    getTeamStandingHeaderCellDom: function(columnName) {
        var teamStandingHeaderCell = document.createElement('th');
        teamStandingHeaderCell.className = 'small';
        teamStandingHeaderCell.innerHTML = columnName;

        return teamStandingHeaderCell;
    },

    // Create a team's row within the standings table.
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

    // Create the footer row, displaying the timestamp of the current standings data.
    getStandingsLastUpdatedRowDom: function(lastUpdated) {
        var lastUpdatedRow = document.createElement('div');
        lastUpdatedRow.className = 'standings-container-row';

        var lastUpdatedCell = document.createElement('div');
        lastUpdatedCell.className = 'standings-container-header xsmall light';
        lastUpdatedCell.innerHTML = 'Last updated: ' + lastUpdated.format('HH:mm DD-MM-YYYY');
        lastUpdatedRow.appendChild(lastUpdatedCell);

        return lastUpdatedRow;
    },

    // Create a DOM with no data, informing the user.
    getNoStandingsDom: function() {
        Log.info('no standings data, bailing early');

        var wrapper = document.createElement('table');
        wrapper.innerHTML = "No standings data...";
        wrapper.className = 'normal';

        return wrapper;
    }
 });