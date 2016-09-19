const Discord = require('discord.js'),
	bot = new Discord.Client({
		fetch_all_members: true
	});

const settings = require('./settings.json'); // Grab all the settings.
const pack = require('./package.json');
const winston = require('winston');
const fse = require('fs-extra');
const Time = require('./Time.js');
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

// var log = (msg) => {
// 	bot.channels.get(settings.channelid).sendMessage(msg);
// };

var date = new Date().toLocaleDateString();
var time = new Date().toLocaleTimeString();
bot.on('ready', () => {
	// let bootup = [
	// 	'```xl',
	// 	'BOOT TIME STATISTICS',
	// 	`• Booted   : ${date} @ ${time}`,
	// 	`• Users	: ${bot.users.size}`,
	// 	`• Servers  : ${bot.guilds.size}`,
	// 	`• Channels : ${bot.channels.size}`,
	// 	'```'
	// ];
	// log(bootup);
});

bot.on('message', msg => {
	if (msg.author.equals(bot.user)) {
		Stats.Messages.Sent++;
	} else Stats.Messages.Received++;
	var params = msg.content.toLowerCase().split(' ').slice(1);
	var filename = '';
	var lmsg = msg.content.toLowerCase();
	var repuser = '';

	function getUserRepFile() {
		let file = '';
		if (!msg.mentions.users.array()[0]) {
			file = `${msg.author.id}.json`;
		} else {
			file = `${msg.mentions.users.array()[0].id}.json`;
		}
		console.log(file);
		return file;
	}

	if (lmsg.startsWith('rep info')) {
		if (msg.author.id !== settings.owner) return;
		let MemoryUsing = bytesToSize(process.memoryUsage().rss, 3);
		let Uptime = GetUptime();
		let djsv = pack.dependencies['discord.js'].split('^')[1];
		let wins = pack.dependencies['winston'].split('^')[1];
		let mome = pack.dependencies['moment'].split('^')[1];
		let fsex = pack.dependencies['fs-extra'].split('^')[1];
		let botv = pack.version;
		let auth = pack.author;
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
			`• Authors	  : ${auth}`,
			`• Discord.JS   : ${djsv}`,
			`• Bot Version  : ${botv}`,
			`• Dependencies : Winston ${wins}, Moment ${mome}, fs-extra ${fsex}`,
			'```'
		];
		msg.channel.sendMessage(message).then(response => response.delete(5000)).catch(console.log);
	} else

	if (lmsg.startsWith('++rep')) {
		if (msg.author.id !== settings.owner) return;
		if (!msg.mentions.users.array()[0] || msg.author === msg.mentions.users.array()[0]) {
			msg.reply('What sad person reps themself?').then(response => response.delete(5000)).catch(console.log);
		} else {
			filename = getUserRepFile();
			fse.stat(`./reputations/${filename}`, (err) => {
				if (err == null) {
					let rep = require(`./reputations/${filename}`);
					let reason = params.slice(1).join(' ');
					bot.fetchUser(msg.mentions.users.array()[0].id).then(user => {
						let repped = false;
						let reppedTime = 0;
						rep.reps.forEach((key) => {
							if (key.id == msg.author.id && Time.Difference(settings.cooldown * 1000 * 60 * 60, Time.now() - key.time).ms > 0) {
								repped = true;
								reppedTime = key.time;
								return;
							}
						});

						if (repped) {
							msg.channel.sendMessage(
									`You have already given rep to that user today.\n` +
									`You may give that user rep again in:\n\n` +
									`**${Time.Difference(settings.cooldown * 1000 * 60 * 60, Time.now() - reppedTime).toString()}.**`)
								.then(message => {
									message.delete(5 * 1000);
								});
							return;
						}
						rep.goodrep++;
						rep.reps.push({
							id: `${msg.author.id}`,
							raw: `${msg.author.username}#${msg.author.discriminator}`,
							reason: `${reason}`,
							type: '+',
							time: `${Date.parse(msg.timestamp)}`
						});
						fse.writeFileSync(`./reputations/${filename}`, JSON.stringify(rep, null, '\t'));
						msg.channel.sendMessage(`${msg.author.username}#${msg.author.discriminator} gave +1 rep to ${user.username}#${user.discriminator}`)
							.then(response => response.delete(5000)).catch(console.log);
					});
				} else if (err.code == 'ENOENT') {
					let reason = params.slice(1).join(' ');
					let rep = require('./reputations/reputation_template.json');
					bot.fetchUser(msg.mentions.users.array()[0].id).then(user => {
						rep.goodrep++;
						rep.reps.push({
							id: `${msg.author.id}`,
							raw: `${msg.author.username}#${msg.author.discriminator}`,
							reason: `${reason}`,
							type: '+',
							time: `${Date.parse(msg.timestamp)}`
						});
						fse.writeFileSync(`./reputations/${filename}`, JSON.stringify(rep, null, '\t'));
						msg.channel.sendMessage(`${msg.author.username}#${msg.author.discriminator} gave +1 rep to ${user.username}#${user.discriminator}`)
							.then(response => response.delete(5000)).catch(console.log);
					});

				} else {
					console.log('Some other error: ', err.code);
				}
			});
		}
	} else

	if (lmsg.startsWith('--rep')) {
		if (msg.author.id !== settings.owner) return;
		if (!msg.mentions.users.array()[0] || msg.author === msg.mentions.users.array()[0]) {
			msg.reply('What sad person reps themself?').then(response => response.delete(5000)).catch(console.log);
		} else {
			filename = getUserRepFile();
			fse.stat(`./reputations/${filename}`, (err) => {
				if (err == null) {
					let rep = require(`./reputations/${filename}`);
					let reason = params.slice(1).join(' ');
					bot.fetchUser(msg.mentions.users.array()[0].id).then(user => {
						let repped = false;
						let reppedTime = 0;
						rep.reps.forEach((key) => {
							if (key.id == msg.author.id && Time.Difference(settings.cooldown * 1000 * 60 * 60, Time.now() - key.time).ms > 0) {
								repped = true;
								console.log('3');
								reppedTime = key.time;
								return;
							}
						});

						if (repped) {
							msg.channel.sendMessage(
									`You have already given rep to that user today.\n` +
									`You may give that user rep again in:\n\n` +
									`**${Time.Difference(settings.cooldown * 1000 * 60 * 60, Time.now() - reppedTime).toString()}.**`)
								.then(message => {
									message.delete(5 * 1000);
								});
							return;
						}
						rep.badrep++;
						rep.reps.push({
							id: `${msg.author.id}`,
							raw: `${msg.author.username}#${msg.author.discriminator}`,
							reason: `${reason}`,
							type: '-',
							time: `${Date.parse(msg.timestamp)}`
						});
						fse.writeFileSync(`./reputations/${filename}`, JSON.stringify(rep, null, '\t'));
						msg.channel.sendMessage(`${msg.author.username}#${msg.author.discriminator} gave -1 rep to ${user.username}#${user.discriminator}`)
							.then(response => response.delete(5000)).catch(console.log);
					});
				} else if (err.code == 'ENOENT') {
					let reason = params.slice(1).join(' ');
					let rep = require('./reputations/reputation_template.json');
					bot.fetchUser(msg.mentions.users.array()[0].id).then(user => {
						rep.badrep++;
						rep.reps.push({
							id: `${msg.author.id}`,
							raw: `${msg.author.username}#${msg.author.discriminator}`,
							reason: `${reason}`,
							type: '-',
							time: `${Date.parse(msg.timestamp)}`
						});
						fse.writeFileSync(`./reputations/${filename}`, JSON.stringify(rep, null, '\t'));
						msg.channel.sendMessage(`${msg.author.username}#${msg.author.discriminator} gave -1 rep to ${user.username}#${user.discriminator}`)
							.then(response => response.delete(5000)).catch(console.log);
					});
				} else {
					console.log('Some other error: ', err.code);
				}
			});
		}
	} else

	if (lmsg.startsWith('??rep')) {
		if (msg.author.id !== settings.owner) return;
		if (!msg.mentions.users.array()[0]) {
			repuser = `${msg.author.id}`;
		} else {
			repuser = `${msg.mentions.users.array()[0].id}`;
		}

		fse.stat(`./reputations/${filename}`, (err) => {
			if (err == null) {
				let rep = require(`./reputations/${filename}`);
				bot.fetchUser(repuser).then(user => {
					let output = `${user.username}#${user.discriminator} has (+${rep.goodrep}|-${rep.badrep}) reputation\n`;
					rep.reps.forEach((item) => {
						output += `(${item.type}) ${item.raw}: ${item.reason}\n`;
					});
					msg.channel.sendMessage('\`\`\`css\n' + output + '\`\`\`')
						.then(response => response.delete(5000)).catch(console.log);
				});
			} else if (err.code == 'ENOENT') {
				msg.channel.sendMessage('No reputation found').then(response => response.delete(5000)).catch(console.log);
			} else {
				console.log('Some other error: ', err.code);
			}
		});
	} else

	if (lmsg.startsWith('rep reboot')) {
		if (msg.author.id !== settings.owner) return;
		const collector = msg.channel.createCollector(m => m.author === msg.author, {
			time: 5000
		});
		msg.channel.sendMessage('Are you sure?').then(response => response.delete(10500)).catch(console.log);
		collector.on('message', m => {
			if (m.content === 'yes' || m.content === 'y') collector.stop('success');
			if (m.content !== 'yes' || m.content !== 'y') collector.stop('failed');
		});
		collector.on('end', (collection, reason) => {
			if (reason === 'time') return msg.channel.sendMessage('Reboot timed out.').then(response => response.delete(5000)).catch(console.log);
			if (reason === 'failed') return msg.channel.sendMessage('Reboot aborted.').then(response => response.delete(5000)).catch(console.log);
			if (reason === 'success') {
				msg.channel.sendMessage('Rebooting...').then(() => {
					bot.destroy().then(() => {
						process.exit();
					}).catch(console.log);
				});
			}
		});
	} else

	if (lmsg.startsWith('rep leave')) {
		var gid = params.slice(1);
		msg.channel.sendMessage(gid);
	}


});

// Catch discord.js errors
var tokenreg = /[\w\d]{24}\.[\w\d]{6}\.[\w\d-_]{27}/g;
bot.on('error', e => {
	winston.error(e.replace(tokenreg, '[REDACTED]'));
});
bot.on('warn', e => {
	winston.warn(e.replace(tokenreg, '[REDACTED]'));
});
bot.on('debug', e => {
	winston.info(e.replace(tokenreg, '[REDACTED]'));
});

bot.login(settings.token);
