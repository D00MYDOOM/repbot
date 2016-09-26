const Discord = require('discord.js'),
	client = new Discord.Client({
		fetch_all_members: true
	});

const settings = require('./settings.json'); // Grab all the settings.
const pack = require('./package.json');
const fse = require('fs-promise');
const Time = require('./time.js');
const winston = require('winston');
winston.add(winston.transports.File, {
	filename: 'logs/reputron.log'
});
winston.remove(winston.transports.Console);
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

var log = (message) => {
	client.channels.get(settings.channelid).sendMessage(message);
};

var date = new Date().toLocaleDateString();
var time = new Date().toLocaleTimeString();
client.on('ready', () => {
	let bootup = [
		'```xl',
		'BOOT TIME STATISTICS',
		`• Booted   : ${date} @ ${time}`,
		`• Users	: ${client.users.size}`,
		`• Servers  : ${client.guilds.size}`,
		`• Channels : ${client.channels.size}`,
		'```'
	];
	log(bootup);
});

client.on('message', message => {
	if (message.author.equals(client.user)) {
		Stats.Messages.Sent++;
	} else Stats.Messages.Received++;
	var params = message.content.toLowerCase().split(' ').slice(1);
	var filename = '';
	var lmsg = message.content.toLowerCase();
	var repuser = '';

	function getUserRepFile() {
		let file = '';
		if (!message.mentions.users.array()[0]) {
			file = `${message.author.id}.json`;
		} else {
			file = `${message.mentions.users.array()[0].id}.json`;
		}
		return file;
	}

	function addRep(a, t, g, u, r) {
		filename = getUserRepFile();
		fse.mkdirs(`./reputations/${g}/`).then(() => {
			fse.stat(`./reputations/${g}/${filename}`, (err) => {
				if (err == null) {
					let rep = require(`./reputations/${g}/${filename}`);
					client.fetchUser(message.mentions.users.first().id).then(user => {
						let repped = false;
						let reppedTime = 0;
						rep.reps.forEach((key) => {
							if (key.id == message.author.id && Time.Difference(settings.cooldown * 1000 * 60 * 60, Time.now() - key.time).ms > 0) {
								repped = true;
								reppedTime = key.time;
								return;
							}
						});
						if (repped) {
							return message.channel.sendMessage(
								`You have already given rep to that user today.\n` +
								`You may give that user rep again in:\n\n` +
								`**${Time.Difference(settings.cooldown * 1000 * 60 * 60, Time.now() - reppedTime).toString()}.**`).then(message => {
									message.delete(5000);
								});
							//return;
						}
						rep.goodrep++;
						rep.reps.push({
							id: `${message.author.id}`,
							raw: `${message.author.username}#${message.author.discriminator}`,
							reason: `${r}`,
							type: '+',
							time: `${Date.parse(message.timestamp)}`
						});
						fse.writeFileSync(`./reputations/${g}/${filename}`, JSON.stringify(rep, null, '\t'));
						var stringresult = `${a} gave ${t}1 rep to ${u}, ${r}`;
						if (!r) {
							stringresult = stringresult.split(',');
							return stringresult[0];
						} else {
							return stringresult;
						}

					});
				}
			});
		});
	}

	if (lmsg === ('rep info')) {
		let MemoryUsing = bytesToSize(process.memoryUsage().rss, 3);
		let Uptime = GetUptime();
		let djsv = pack.dependencies['discord.js'].split('^')[1];
		let wins = pack.dependencies['winston'].split('^')[1];
		let fspr = pack.dependencies['fs-promise'].split('^')[1];
		let botv = pack.version;
		let auth = pack.author;
		let infomsg = [
			'```xl',
			'STATISTICS',
			`• Uptime	   : ${Uptime}`,
			`• Booted	   : ${date} @ ${time}`,
			`• Mem Usage	: ${MemoryUsing}`,
			`• Msgs Sent	: ${Stats.Messages.Sent}`,
			`• Msgs Rece	: ${Stats.Messages.Received}`,
			'',
			'SERVING',
			`• Users		: ${client.users.size}`,
			`• Servers	  : ${client.guilds.size}`,
			`• Channels	 : ${client.channels.size}`,
			'',
			'BOT INFORMATION',
			`• Authors	  : ${auth}`,
			`• Discord.JS   : ${djsv}`,
			`• Bot Version  : ${botv}`,
			`• Dependencies : Winston ${wins}, fs-promise ${fspr}`,
			'```'
		];
		message.channel.sendMessage(infomsg).then(response => response.delete(15000)).catch(console.log);
	} else

	if (lmsg === ('rep help')) {
		var infohelp = [
			'\`\`\`xl',
			'Available commands:',
			'++rep	  : Usage: ++rep <mention>, Give a user +1 rep',
			'--rep	  : Usage: --rep <mention>, Give a user -1 rep',
			'			 You can apply an optional message to the above commands.',
			'??rep	  : Usage: ??rep <mention>, Check rep for the provided user, or yourself.',
			'rep help   : Provides this list of commands.',
			'rep info   : Provides bot statistics.',
			'',
			'Staff only commands',
			'rep reboot : Logs out and terminates the process, use with PM2',
			'More soon',
			'\`\`\`'
		];
		message.channel.sendMessage(infohelp).then(response => response.delete(15000)).catch(console.log);
	}

	if (lmsg.startsWith('++rep')) {
		if (!message.mentions.users || message.author === message.mentions.users.first()) {
			message.reply('What sad person reps themself?').then(response => response.delete(5000)).catch(console.log);
		} else {
			filename = getUserRepFile();
			fse.stat(`./reputations/${filename}`, (err) => {
				if (err == null) {
					let rep = require(`./reputations/${filename}`);
					let reason = params.slice(1).join(' ');
					client.fetchUser(message.mentions.users.first().id).then(user => {
						let repped = false;
						let reppedTime = 0;
						rep.reps.forEach((key) => {
							if (key.id == message.author.id && Time.Difference(settings.cooldown * 1000 * 60 * 60, Time.now() - key.time).ms > 0) {
								repped = true;
								console.log('3');
								reppedTime = key.time;
								return;
							}
						});

						if (repped) {
							message.channel.sendMessage(
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
							id: `${message.author.id}`,
							raw: `${message.author.username}#${message.author.discriminator}`,
							reason: `${reason}`,
							type: '+',
							time: `${Date.parse(message.timestamp)}`
						});
						fse.writeFileSync(`./reputations/${filename}`, JSON.stringify(rep, null, '\t'));
						message.channel.sendMessage(`${message.author.username}#${message.author.discriminator} gave -1 rep to ${user.username}#${user.discriminator}`)
							.then(response => response.delete(5000)).catch(console.log);
					});
				} else if (err.code == 'ENOENT') {
					let reason = params.slice(1).join(' ');
					let rep = require('./reputations/reputation_template.json');
					client.fetchUser(message.mentions.users.first().id).then(user => {
						rep.badrep++;
						rep.reps.push({
							id: `${message.author.id}`,
							raw: `${message.author.username}#${message.author.discriminator}`,
							reason: `${reason}`,
							type: '+',
							time: `${Date.parse(message.timestamp)}`
						});
						fse.writeFileSync(`./reputations/${filename}`, JSON.stringify(rep, null, '\t'));
						message.channel.sendMessage(`${message.author.username}#${message.author.discriminator} gave -1 rep to ${user.username}#${user.discriminator}`)
							.then(response => response.delete(5000)).catch(console.log);
					});
				} else {
					console.log('Some other error: ', err.code);
				}
			});
		}
	} else

	if (lmsg.startsWith('--rep')) {
		if (!message.mentions.users.array()[0] || message.author === message.mentions.users.array()[0]) {
			message.reply('What sad person reps themself?').then(response => response.delete(5000)).catch(console.log);
		} else {
			filename = getUserRepFile();
			fse.stat(`./reputations/${filename}`, (err) => {
				if (err == null) {
					let rep = require(`./reputations/${filename}`);
					let reason = params.slice(1).join(' ');
					client.fetchUser(message.mentions.users.array()[0].id).then(user => {
						let repped = false;
						let reppedTime = 0;
						rep.reps.forEach((key) => {
							if (key.id == message.author.id && Time.Difference(settings.cooldown * 1000 * 60 * 60, Time.now() - key.time).ms > 0) {
								repped = true;
								console.log('3');
								reppedTime = key.time;
								return;
							}
						});

						if (repped) {
							message.channel.sendMessage(
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
							id: `${message.author.id}`,
							raw: `${message.author.username}#${message.author.discriminator}`,
							reason: `${reason}`,
							type: '-',
							time: `${Date.parse(message.timestamp)}`
						});
						fse.writeFileSync(`./reputations/${filename}`, JSON.stringify(rep, null, '\t'));
						message.channel.sendMessage(`${message.author.username}#${message.author.discriminator} gave -1 rep to ${user.username}#${user.discriminator}`)
							.then(response => response.delete(5000)).catch(console.log);
					});
				} else if (err.code == 'ENOENT') {
					let reason = params.slice(1).join(' ');
					let rep = require('./reputations/reputation_template.json');
					client.fetchUser(message.mentions.users.array()[0].id).then(user => {
						rep.badrep++;
						rep.reps.push({
							id: `${message.author.id}`,
							raw: `${message.author.username}#${message.author.discriminator}`,
							reason: `${reason}`,
							type: '-',
							time: `${Date.parse(message.timestamp)}`
						});
						fse.writeFileSync(`./reputations/${filename}`, JSON.stringify(rep, null, '\t'));
						message.channel.sendMessage(`${message.author.username}#${message.author.discriminator} gave -1 rep to ${user.username}#${user.discriminator}`)
							.then(response => response.delete(5000)).catch(console.log);
					});
				} else {
					console.log('Some other error: ', err.code);
				}
			});
		}
	} else

	if (lmsg.startsWith('??rep')) {
		if (!message.mentions.users.array()[0]) {
			repuser = `${message.author.id}`;
		} else {
			repuser = `${message.mentions.users.array()[0].id}`;
		}

		fse.stat(`./reputations/${filename}`, (err) => {
			if (err == null) {
				let rep = require(`./reputations/${filename}`);
				client.fetchUser(repuser).then(user => {
					let output = `${user.username}#${user.discriminator} has (+${rep.goodrep}|-${rep.badrep}) reputation\n`;
					rep.reps.forEach((item) => {
						output += `(${item.type}) ${item.raw}: ${item.reason}\n`;
					});
					message.channel.sendMessage('\`\`\`css\n' + output + '\`\`\`')
						.then(response => response.delete(5000)).catch(console.log);
				});
			} else if (err.code == 'ENOENT') {
				message.channel.sendMessage('No reputation found').then(response => response.delete(5000)).catch(console.log);
			} else {
				console.log('Some other error: ', err.code);
			}
		});
	} else

	if (lmsg === ('rep reboot')) {
		if (!message.member.hasPermission('ADMINISTRATOR') || !message.member.hasPermission('MANAGE_GUILD')) return;
		const collector = message.channel.createCollector(m => m.author === message.author, {
			time: 5000
		});
		message.channel.sendMessage('Are you sure?').then(response => response.delete(10500)).catch(console.log);
		collector.on('message', m => {
			if (m.content === 'yes' || m.content === 'y') collector.stop('success');
			if (m.content !== 'yes' || m.content !== 'y') collector.stop('failed');
		});
		collector.on('end', (collection, reason) => {
			if (reason === 'time') return message.channel.sendMessage('Reboot timed out.').then(response => response.delete(5000)).catch(console.log);
			if (reason === 'failed') return message.channel.sendMessage('Reboot aborted.').then(response => response.delete(5000)).catch(console.log);
			if (reason === 'success') {
				message.channel.sendMessage('Rebooting...').then(() => {
					client.destroy().then(() => {
						process.exit();
					}).catch(console.log);
				});
			}
		});
	} else

	if (lmsg.startsWith('leave reputar')) {
		if (message.author.id !== settings.owner) return;
		const collector = message.channel.createCollector(m => m.author === message.author, {
			time: 5000
		});
		var gid = params.slice(1).toString();
		if (gid && !isNaN(gid)) {
			message.channel.sendMessage(`Are you sure you want to leave ${client.guilds.get(gid).name}?`).then(response => response.delete(10500)).catch(console.log);
			collector.on('message', m => {
				if (m.content === 'yes' || m.content === 'y') collector.stop('success');
				if (m.content !== 'yes' || m.content !== 'y') collector.stop('failed');
			});
			collector.on('end', (collection, reason) => {
				if (reason === 'time') return message.channel.sendMessage('Leave timed out.').then(response => response.delete(5000)).catch(console.log);
				if (reason === 'failed') return message.channel.sendMessage('Leave aborted.').then(response => response.delete(5000)).catch(console.log);
				if (reason === 'success') {
					message.channel.sendMessage(`Leaving ${client.guilds.get(gid).name}`).then(() => {
						client.guilds.get(gid).leave();
					}).then(response => response.delete(5000)).catch(console.log);
				}

			});

		} else

		if (!gid) {
			message.channel.sendMessage(`Are you sure you want to leave ${message.guild.name}?`).then(response => response.delete(10500)).catch(console.log);
			collector.on('message', m => {
				if (m.content === 'yes' || m.content === 'y') collector.stop('success');
				if (m.content !== 'yes' || m.content !== 'y') collector.stop('failed');
			});
			collector.on('end', (collection, reason) => {
				if (reason === 'time') return message.channel.sendMessage('Leave timed out.').then(response => response.delete(5000)).catch(console.log);
				if (reason === 'failed') return message.channel.sendMessage('Leave aborted.').then(response => response.delete(5000)).catch(console.log);
				if (reason === 'success') {
					message.channel.sendMessage(`Leaving ${message.guild.name}`).then(() => {
						message.guild.leave();
					}).then(response => response.delete(5000)).catch(console.log);
				}

			});

		}
	} else

	if (lmsg === ('invite reputar')) {
		let output = 'So, you want to invite me to your server do you?\nWell here\'s my link! knock yourself out!\nhttps://discordapp.com/oauth2/authorize?client_id=226743018789535754&scope=bot';
		message.channel.sendMessage(output).then(response => response.delete(15000)).catch(console.log);
	}


});

client.on('presenceUpdate', (oldUser, newUser) => {
	if(newUser.id === settings.owner) {
		// if (newUser.status === 'idle') {
		log(newUser.status + ' <= New / Old => ' + oldUser.status);
		// }
	} else
	if (newUser.game !== oldUser.game){
		log('Game Changed');
	}
});

// Catch discord.js errors
var tokenreg = /[\w\d]{24}\.[\w\d]{6}\.[\w\d-_]{27}/g;
client.on('error', e => {
	winston.error(e.replace(tokenreg, '[REDACTED]'));
});
client.on('warn', e => {
	winston.warn(e.replace(tokenreg, '[REDACTED]'));
});
client.on('debug', e => {
	winston.info(e.replace(tokenreg, '[REDACTED]'));
});

client.login(settings.token);
