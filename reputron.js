const Discord = require('discord.js'),
	bot = new Discord.Client({
		fetch_all_members: true
	});

const settings = require('./settings.json'); // Grab all the settings.
const pack = require('./package.json');
const moment = require('moment');
const winston = require('winston');
const Stats = {
	Messages: {
		Received: 0,
		Sent: 0
	}
};

function GetUptime() {
	let sec_num = parseInt(process.uptime(), 10);
	let days = Math.floor(sec_num / 86400);
	sec_num %= 86400;
	let hours = Math.floor(sec_num / 3600);
	let minutes = Math.floor((sec_num - (hours * 3600)) / 60);
	let seconds = sec_num - (hours * 3600) - (minutes * 60);
	if (days < 10) days = '0' + days;
	if (hours < 10) hours = '0' + hours;
	if (minutes < 10) minutes = '0' + minutes;
	if (seconds < 10) seconds = '0' + seconds;
	let time = '';
	if (days != '00') time += `${days} ${days == '01' ? 'day' : 'days'} `;
	if (days != '00' || hours != '00') time += `${hours} ${hours == '01' ? 'hour' : 'hours'} `;
	if (days != '00' || hours != '00' || minutes != '00') time += `${minutes} ${minutes == '01' ? 'minute' : 'minutes'} `;
	if (days != '00' || hours != '00' || minutes != '00' || seconds != '00') time += `${seconds} ${seconds == '01' ? 'second' : 'seconds'} `;
	return time;
}

let unit = ['', 'K', 'M', 'G', 'T', 'P'];

function bytesToSize(input, precision) {
	let index = Math.floor(Math.log(input) / Math.log(1024));
	if (unit >= unit.length) return input + ' B';
	return (input / Math.pow(1024, index)).toFixed(precision) + ' ' + unit[index] + 'B';
}

var log = (msg) => {
	bot.channels.get(settings.channelid).sendMessage(msg);
};

var date = new Date().toLocaleDateString();
var time = new Date().toLocaleTimeString();
bot.on('ready', () => {
	let bootup = [
		'```xl',
		'BOOT TIME STATISTICS',
		`• Booted   : ${date} @ ${time}`,
		`• Users	: ${bot.users.size}`,
		`• Servers  : ${bot.guilds.size}`,
		`• Channels : ${bot.channels.size}`,
		'```'
	];
	log(bootup);
});

bot.on('message', msg => {
	if (msg.author.equals(bot.user)) {
		Stats.Messages.Sent++;
	} else Stats.Messages.Received++;
	var params = msg.content.split(' ').slice(1);
	var prefix = 'rep';

	var lmsg = msg.content.toLowerCase();

	if (lmsg.startsWith(prefix + ' info')) {
		let MemoryUsing = bytesToSize(process.memoryUsage().rss, 3);
		let Uptime = GetUptime();
		let djsv = pack.dependencies['discord.js'].split('^')[1];
		let wins = pack.dependencies['winston'].split('^')[1];
		let mome = pack.dependencies['moment'].split('^')[1];
		let botv = pack.version;

		let message = [
			'```xl',
			'STATISTICS',
			`• Uptime	   : ${Uptime}`,
			`• Booted	   : ${date} @ ${time}`,
			`• Mem Usage	: ${MemoryUsing}`,
			`• Msgs Sent	: ${Stats.Messages.Sent}`,
			`• Msgs Rece	: ${Stats.Messages.Received}`,
			'',
			'SERVING',
			`• Users		: ${bot.users.size}`,
			`• Servers	  : ${bot.guilds.size}`,
			`• Channels	 : ${bot.channels.size}`,
			'',
			'BOT INFORMATION',
			`• Discord.JS   : ${djsv}`,
			`• Bot Version  : ${botv}`,
			`• Dependencies : Winston ${wins}, Moment ${mome}`,
			'```'
		];
		msg.channel.sendMessage(message).catch(console.log);

	}


});
bot.login(settings.token);
