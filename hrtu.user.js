// ==UserScript==
// @name         Horriblesubs Release Time Until
// @namespace    horriblesubs_release_time_until
// @description  Change times on horriblesubs to "until/ago" and highlight shows you're watching
// @homepageURL  https://github.com/namiman/horriblesubs_release_time_until
// @author       namiman
// @version      1
// @date         2015-12-07
// @include      http://horriblesubs.info/*
// @downloadURL  https://raw.githubusercontent.com/namiman/horriblesubs_release_time_until/master/hrtu.user.js
// @updateURL    https://raw.githubusercontent.com/namiman/horriblesubs_release_time_until/master/hrtu.meta.js
// @grant        none
// ==/UserScript==

console.log( "Horriblesubs Release Time Until userscript loaded" );

var user_shows_key = 'hrtu_user_shows';
var user_shows = JSON.parse( localStorage.getItem( user_shows_key ) );
if ( ! user_shows )
	user_shows = {};

var weekdays = [
	"YABOI", // horriblesubs starts the week on monday, not sunday
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
	"Sunday"
];

function parseTime( str ) {
	var match = str.match( /(\d+):(\d+)/ );
	return {
		hours: match[1],
		minutes: match[2]
	};
}
function timeAgo( hours, minutes, day ) {
	var now = new Date();
	var dst_start = new Date( now.getFullYear(), 3, 8 );
	var dst_end = new Date( now.getFullYear(), 11, 1 );
	var offset = ( now > dst_start && now < dst_end ) ? -7 : -8 ;
	var pacific_time = new Date( now.getTime() + offset * 3600 * 1000 );

	var time_show = new Date( pacific_time.getFullYear(), pacific_time.getMonth(), pacific_time.getDate(), 0, 0, 0 );
	var day_diff = ( pacific_time.getDay() === 0 ) ? 0 : ( day - pacific_time.getDay() );
		time_show.setDate( pacific_time.getDate() + day_diff );
		time_show.setHours( parseInt( hours ) + parseInt( offset ) );
		time_show.setMinutes( minutes );

	var time_units;
	var time_until = Math.round( ( time_show - pacific_time ) / 1000 / 60 );
	var time_direction = (time_until > 0) ? 1 : (time_until === 0) ? 0 : -1;
	time_until = Math.abs( time_until );
	if ( time_until === 0 )
		time_units = '';
	else if ( time_until > 60 ) {
		time_until = ( time_until / 60 ).toFixed( 1 );
		time_units = ( time_until > 1 ) ? 'hours' : 'hour';
	}
	else
		time_units = ( time_until > 1 ) ? 'minutes' : 'minute';

	var ending_phrase = (time_direction > 0) ? 'until' : (time_direction === 0) ? 'now' : 'ago';

	return {
		'text': ( time_direction === 0 ) ? ending_phrase : time_until + ' ' + time_units + ' ' + ending_phrase,
		'time': time_until,
		'direction': time_direction
	};
}

function sideBar() {
	if ( ! jQuery( '.schedule-today:not( .hrtu_sidebar )' ).length ) {
		console.warn( "Horriblesubs Release Time Until sideBar(): Unable to find '.schedule-today'" );
		return false;
	}
	
	jQuery( '.schedule-today:not( .hrtu_sidebar ) .schedule-table tr' ).each(function(){
		var row = jQuery(this);
		var title_el = row.find( '.schedule-widget-show' );
		if ( ! title_el.hasClass( "hrtu_sidebar_show_name" ) ) {
			title_el.addClass( "hrtu_sidebar_show_name" );
			title_el.find( "a" ).text( fixTitle( title_el.find( "a" ).text() ) );
		}
		if ( user_shows[ title_el.text() ] )
			row.addClass( "hrtu_sidebar_highlight" );
		else
			row.removeClass( "hrtu_sidebar_highlight" );
		var time_el = row.find( '.schedule-time' );
		if ( time_el[0].hasAttribute( 'data-hrtu-time' ) )
			var time_text = time_el.attr( 'title' );
		else
			var time_text = time_el.text();
		var match = parseTime( time_text );
		var today = new Date();
		var show = timeAgo( match.hours, match.minutes, today.getDay() );
		time_el
			.attr( 'title', time_text )
			.attr( 'data-hrtu-time', show.time )
			.text( show.text );
		if ( show.direction < 0 )
			time_el.addClass( 'hrtu_release_page_time_passed' );
	});
}

function fixTitle( str ) {
	return str.replace( /\u2013|\u002D/g, "-" );
}

function releasePage() {
	if ( ! jQuery( '.entry-content' ).length || ! jQuery( '.entry-content' ).children().length ) {
		console.warn( "Horriblesubs Release Time Until releasePage(): Unable to find release entries" );
		return false;
	}

	if ( ! jQuery( '.hrtu_instructions' ).length )
		jQuery( jQuery( ".entry-content ul" ).get(0) ).append( '<li class="hrtu_instructions">Click [+] or [-] on shows you\'re watching to highlight them</li>' );

	var entry_day;
	jQuery( '.entry-content' ).children().each(function(){
		var time_text = '';
		var el = jQuery(this);
		if ( el.hasClass( 'weekday' ) ) {
			if ( el.text() == "To be scheduled" )
				entry_day = 'tbd';
			else
				entry_day = weekdays.indexOf( el.text() );
		}
		else if ( el.hasClass( 'schedule-today-table' ) ) {
			el.find( '.schedule-page-show' ).each(function(){
				var title_el = jQuery(this);
				title_el.find( "a" ).text( fixTitle( title_el.find( "a" ).text() ) );
				if ( user_shows[ title_el.find( "a" ).text() ] )
					title_el.parent().addClass( "hrtu_release_page_highlight" );
				else
					title_el.parent().removeClass( "hrtu_release_page_highlight" );
				if ( ! title_el.find( '.hrtu_release_page_toggle' ).length ) {
					title_el.append( '<div class="hrtu_release_page_toggle"></div>' );
					title_el.on( "click", ".hrtu_release_page_toggle", function(e){
						console.log( "click" );
						var title = jQuery(this).parent().find( "a" ).text();
						console.log( "title = " + title ); 
						var is_saved = jQuery(this).parent().parent().hasClass( "hrtu_release_page_highlight" );
						console.log( "set show to = " + ( is_saved ) ? 0 : 1 );
						if ( is_saved ) {
							delete user_shows[ title ];
							hrtuSidebarRemoveShow( title );
						}
						else
							user_shows[ title ] = 1;
						console.log( user_shows );
						localStorage.setItem( user_shows_key, JSON.stringify( user_shows ) );
						releasePage();
						sideBar();
						e.stopPropagation();
					});
				}
			});
			el.find( '.schedule-time' ).each(function(){
				var show;
				var time_el = jQuery(this);
				if ( ! time_el.length ) {
					console.warn( "Horriblesubs Release Time Until releasePage(): No .schedule-time found" );
					return false;
				}
				if ( entry_day == 'tbd' || time_el.attr( 'title' ) === "" ) {
					show = {
						time: "00:00",
						text: "",
						direction: 1
					};
				}
				else {
					if ( time_el[0].hasAttribute( 'data-hrtu-time' ) )
						var time_text = time_el.attr( 'title' );
					else
						var time_text = time_el.text();
					
					time_el.title = time_text;
					var match = parseTime( time_text );
					if ( ! match )
						console.warn( "Horriblesubs Release Time Until releasePage(): Unable to parse release time ["+ time_text +"]" );
					show = timeAgo( match.hours, match.minutes, entry_day );
				}
				time_el
					.attr( 'title', time_text )
					.attr( 'data-hrtu-time', show.time )
					.text( show.text )
					.parent()
						.addClass( 'hrtu_series_name' );
				if ( show.direction < 0 )
					time_el.addClass( 'hrtu_release_page_time_passed' );

				if ( time_el.parent().hasClass( "hrtu_release_page_highlight" ) ) {
					var title_a = time_el.parent().find( ".schedule-page-show a" );
					hrtuSidebarAddShow( title_a.text(), show.time, show.text, title_a.attr( 'href' ) );
				}
			});
		}
	});
}

function hrtuSidebarAddShow( title, otime, time_text, href ) {
	if ( ! jQuery( '#hrtu_sidebar' ).length ) {
		jQuery( '#sidebar .xoxo' ).first().append(
			'<li id="hrtu_sidebar" class="widget-container widget_text">' +
			'	<h3 class="widget-title">My Shows</h3>' +
			'	<div class="textwidget">' +
			'		<div class="schedule-today hrtu_sidebar">' +
			'			<table class="schedule-table" border="0" cellpadding="0" cellspacing="0">' +
			'				<tbody></tbody>' +
			'			</table>' +
			'		</div>' +
			'	</div>' +
			'</li>'
		);
	}

	var exists = false;
	jQuery( '#hrtu_sidebar .textwidget .schedule-table tbody td.hrtu_sidebar_show_name' ).each(function(){
		if ( jQuery(this).find( 'a' ).text() == title ) {
			exists = true;
			return false;
		}
	});
	if ( exists === false ) {
		var color_class = ( /ago/.test( time_text ) ) ? "hrtu_release_page_time_passed" : "" ;
		jQuery( '#hrtu_sidebar .textwidget .schedule-table tbody' ).append(
			'<tr>' +
			'	<td class="schedule-widget-show hrtu_sidebar_show_name">' +
			'		<a title="See all releases for this show" href="'+ href +'">'+ title +'</a>' +
			'	</td>' +
			'	<td title="'+ otime +'" class="schedule-time '+ color_class +'">'+ time_text +'</td>' +
			'</tr>'
		);
	}
}

function hrtuSidebarRemoveShow( title ) {
	jQuery( '#hrtu_sidebar .textwidget .schedule-table tbody td.hrtu_sidebar_show_name' ).each(function(){
		if ( jQuery(this).find( 'a' ).text() == title ) {
			jQuery( this ).parent().remove();
			return false;
		}
	});
}

function hrtuSidebarClear() {
	jQuery( '#hrtu_sidebar .textwidget .schedule-table tbody tr' ).remove();
}

function hrtuSidebarRefresh() {
	if ( ! jQuery( '.entry-content' ).length || ! jQuery( '.entry-content' ).children().length ) {
		console.warn( "Horriblesubs Release Time Until hrtuSidebarRefresh(): Unable to find release entries" );
		return false;
	}

	hrtuSidebarClear();

	jQuery( '.entry-content' ).children().each( function(){
		var el = jQuery(this);
		if ( el.hasClass( 'schedule-today-table' ) ) {
			el.find( '.schedule-page-show' ).each(function(){
				var title_el = jQuery(this);
				var title = title_el.find( "a" ).text();
				if ( user_shows[ title ] )
					hrtuSidebarAddShow( title );
				else
					hrtuSidebarRemoveShow( title );
			});
		}
	});
}

function addStyles() {
	// added body class to give us some extra specificity to hopefully override page styles
	jQuery( 'body' ).addClass( "hrtu" );
	jQuery( 'head' ).append(
		'<style type="text/css">' +
		'	.hrtu .hrtu_series_name {' +
		'		padding: 0px 6px;' +
		'	}' +
		'	.hrtu .hrtu_series_name:hover {' +
		'		background-color: rgb( 230,230,230 );' +
		'	}' +
		'	.hrtu .hrtu_sidebar_show_name {' +
		'		width: 60%;' +
		'	}' +
		'	.hrtu .hrtu_sidebar_highlight {' +
		'		background-color: rgb( 191,209,236 );' +
		'		color: rgb( 0,0,0 );' +
		'	}' +
		'	.hrtu .hrtu_release_page_time_passed {' +
		'		color: rgb( 179,179,179 );' +
		'	}' +
		'	.hrtu .hrtu_sidebar_highlight .hrtu_release_page_time_passed {' +
		'		color: rgb( 129,129,129 );' +
		'	}' +
		'	.hrtu .hrtu_release_page_highlight {' +
		'		background-color: rgb( 214,226,243 );' +
		'	}' +
		'	.hrtu .hrtu_release_page_highlight .hrtu_release_page_time_passed {' +
		'		color: rgb( 144,144,144 );' +
		'	}' +
		'	.hrtu .hrtu_release_page_toggle {' +
		'		width: 24px;' +
		'		height: 24px;' +
		'		text-align: center;' +
		'		line-height: 24px;' +
		'		cursor: pointer;' +
		'		display: inline-block;' +
		'		margin-left: 7px;' +
		'	}' +
		'	.hrtu .hrtu_release_page_toggle:before {' +
		'		content: "[+]";' +
		'	}' +
		'	.hrtu .hrtu_release_page_highlight .hrtu_release_page_toggle:before {' +
		'		content: "[-]";' +
		'	}' +
		'</style>'
	);
}

addStyles();
sideBar();
if ( window.location.pathname == '/release-schedule/' )
	releasePage();


setInterval( function(){
	sideBar();
	releasePage();
}, 60000 );
