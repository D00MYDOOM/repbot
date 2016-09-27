const Discord = require('discord.js'),
	client = new Discord.Client({
		fetch_all_members: true
	});

const settings = require('./settings.json'); // Grab all the settings.
const pack = require('./package.json');
const sql = require('sqlite');
//const Time = require('./time.js');
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
		'\`\`\`',
		'BOOT TIME STATISTICS',
		`• Booted   : ${date} @ ${time}`,
		`• Users	: ${client.users.size}`,
		`• Servers  : ${client.guilds.size}`,
		`• Channels : ${client.channels.size}`,
		'\`\`\`'
	];
	// log(bootup);
});

client.on('message', message => {
	if (message.author.equals(client.user)) {
		Stats.Messages.Sent++;
	} else Stats.Messages.Received++;
	var params = message.content.toLowerCase().split(' ').slice(1);
	// var filename = '';
	var lmsg = message.content.toLowerCase();

	function addRep(awardee, guildid, awarder, type, reason) {
		var goodrep = 0;
		var badrep = 0;
		var success = false;
		if (type === '+') {
			goodrep = 1;
		} else {
			badrep = 1;
		}
		sql.open('./reputation.sqlite').then(() =>
			sql.run('INSERT INTO reputations (guildid, awardeeid, goodrep, badrep, awarder, rawuser, type, reason, time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [guildid, awardee, goodrep, badrep, awarder, client.users.get(awarder).username+'#'+client.users.get(awarder).discriminator, type, reason, Date.now()])
				.then(() =>{
					return success = true;
				}).catch(error => message.channel.sendMessage(error.stack)));
		if (success) {
			return `${client.users.get(awarder).username}#${client.users.get(awarder).discriminator} gave ${type}1 rep to ${client.users.get(awardee).username}#${client.users.get(awardee).discriminator}, ${reason}`;
		} else {
			return 'Bullshit';
		}

	}

	if (lmsg === ('rep info')) {
		let MemoryUsing = bytesToSize(process.memoryUsage().rss, 3);
		let Uptime = GetUptime();
		let djsv = pack.dependencies['discord.js'].split('^')[1];
		let wins = pack.dependencies['winston'].split('^')[1];
		let sqli = pack.dependencies['sqlite'].split('^')[1];
		let botv = pack.version;
		let auth = pack.author;
		let infomsg = [
			'\`\`\`',
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
			`• Dependencies : Winston ${wins}, SQLite ${sqli}`,
			'\`\`\`'
		];
		message.channel.sendMessage(infomsg).then(response => response.delete(15000)).catch(console.log);
	} else

	if (lmsg === ('rep help')) {
		var infohelp = [
			'\`\`\`',
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
		if (!message.mentions.users.array()[0]) {
			message.reply('you\'re a loser for trying to rep yourself');
		} else {
			let reason = message.content.split(' ').slice(2).join(' ');
			if (!reason) return message.channel.sendMessage('You must supply a reason to give reputation');
			message.channel.sendMessage(addRep(message.mentions.users.array()[0].id, message.guild.id, message.author.id, '+', reason));
		}
	} else

	if (lmsg.startsWith('--rep')) {
		if (!message.mentions.users.array()[0]) {
			message.reply('you\'re a loser for trying to rep yourself');
		} else {
			let reason = message.content.split(' ').slice(2).join(' ');
			if (!reason) return message.channel.sendMessage('You must supply a reason to give reputation');
			message.channel.sendMessage(addRep(message.mentions.users.array()[0].id, message.guild.id, message.author.id, '-', reason));
		}
	} else

	if (lmsg.startsWith('??rep')) {
		if (message.mentions.users.array()[0]) {
			var mentioneduser = message.mentions.users.array()[0];
			sql.open('./reputation.sqlite').then(() => sql.all('SELECT * FROM reputations WHERE awardeeid = ?', mentioneduser.id)).then(rows => {
				if (rows.filter(user => user.awardeeid == mentioneduser.id)) {
					let goodreps = rows.filter(rep => rep.guildid == message.guild.id).map(rep => rep.goodrep).reduce((prev, cur) => {
						return prev + cur;
					});
					let badreps = rows.filter(rep => rep.guildid == message.guild.id).map(rep => rep.badrep).reduce((prev, cur) => {
						return prev + cur;
					});

					let result = [];
					result.push('\`\`\`');
					result.push(`${client.users.get(mentioneduser.id).username}#${client.users.get(mentioneduser.id).discriminator} has ( +${goodreps} / -${badreps} )`);
					rows.filter(rep => rep.guildid == message.guild.id).map(rows => {
						result.push(`(${rows.type}) ${rows.rawuser}: ${rows.reason}`);
					});
					result.push('\`\`\`');
					message.channel.sendMessage(result);
				} else {
					message.channel.sendMessage(`Could not find any reputation for **${mentioneduser.username}**.`).then(response => {
						response.delete(5000).catch(error => log('False no contents: ' + error.stack));
					});
				}
			}).catch(error => log(error.stack));
		} else {
			sql.open('./reputation.sqlite').then(() => sql.get('SELECT * FROM reputations WHERE awardeeid = ?', message.author.id)).then(row => {
				if (!row) {
					message.channel.sendMessage(`Could not find any reputation for **${message.author.username}**.`).then(response => {
						response.delete(5000).catch(error => log('False no contents: ' + error.stack));
					});
				} else {
					let message_content = row.rawuser;
					console.log('Row Contents: ' + row.rawuser);
					message.channel.sendMessage(message_content).catch(error => log('False row contents: ' + error.stack));
				}
			}).catch(error => log('False Condition: ' + error.stack));

		}
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
