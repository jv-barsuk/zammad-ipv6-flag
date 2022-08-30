# Copyright (C) 2012-2022 Zammad Foundation, https://zammad-foundation.org/

module HandlesCoreWorkflow
  extend ActiveSupport::Concern

  included do
    def set_core_workflow_information(data, klass, screen = 'create')
      return if data[:screen].present?
      return if klass.included_modules.exclude?(ChecksCoreWorkflow)

      data[:screen] = screen

      true
    end
  end
end
