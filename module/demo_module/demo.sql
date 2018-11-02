create table `t_tag` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(30) NOT NULL,
  `description` varchar(200) NOT NULL DEFAULT '',
  `type` int(4) NOT NULL DEFAULT 1,
  `extra` varchar(30),
  `status` tinyint(1) NOT NULL DEFAULT 1,
  primary key (`id`),
) ENGINE=InnoDB DEFAULT charset=utf8