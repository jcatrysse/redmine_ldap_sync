module LdapSync::Infectors
  Dir[File.join(__dir__, 'infectors', '*.rb')].each do |file|
    require_dependency file

    infected_name = File.basename(file, '.rb').classify

    # Deze patch-module bevat zelf al de include-logica
    next if infected_name == 'AuthSourceLdap'

    next unless const_defined?(infected_name, false)
    mod = const_get(infected_name, false)
    cls = Kernel.const_get(infected_name)
    cls.include(mod) unless cls < mod
  end
end
