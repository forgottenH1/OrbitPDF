import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';


interface ToolCardProps {
    title: string;
    description: string;
    icon: React.ElementType;
    onClick?: () => void;
    className?: string;
    tag?: string;
    toolId?: string; // Add ID to construct URL
}

const ToolCard: React.FC<ToolCardProps> = ({ title, description, icon: Icon, onClick, className = '', tag, toolId }) => {
    const { t } = useTranslation();
    const handleClick = () => {
        if (onClick) {
            onClick();
        } else if (toolId) {
            // Force full page reload for ad impressions
            window.location.href = `/${toolId}`;
        }
    };

    return (
        <div
            className={`
                group relative overflow-hidden rounded-3xl 
                glass-card-premium p-1 
                cursor-pointer 
                transition-all duration-300 ease-out
                hover:scale-[1.02] hover:-translate-y-2
                hover:shadow-[0_20px_40px_-15px_rgba(59,130,246,0.3)]
                ${className}
            `}
            onClick={handleClick}
        >
            {/* Inner Content Container */}
            <div className="relative h-full rounded-[20px] bg-slate-900/40 p-3 md:p-6 overflow-hidden">

                {/* Dynamic Background Gradients */}
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl group-hover:bg-blue-400/30 transition-colors duration-500" />
                <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl group-hover:bg-purple-400/30 transition-colors duration-500" />

                {/* Shimmer Effect on Hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer" />
                </div>

                <div className="relative z-10 flex flex-col h-full">
                    {/* Header: Icon & Tag */}
                    <div className="flex justify-between items-start mb-2 md:mb-5">
                        <div className="relative">
                            <div className="absolute inset-0 bg-blue-400/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="relative p-1.5 md:p-3.5 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 group-hover:border-blue-400/30 group-hover:scale-110 transition-all duration-300 shadow-lg">
                                <Icon className="w-5 h-5 md:w-8 md:h-8 text-blue-300 group-hover:text-white transition-colors duration-300" />
                            </div>
                        </div>
                        {tag && (
                            <span className="px-2 py-0.5 md:px-3 md:py-1 text-[8px] md:text-[10px] font-bold tracking-wider uppercase text-blue-200 bg-blue-500/20 rounded-full border border-blue-500/20 shadow-sm backdrop-blur-md">
                                {t(`categories.${tag}`)}
                            </span>
                        )}
                    </div>

                    {/* Content */}
                    <h3 className="text-base md:text-xl font-bold text-white mb-0.5 md:mb-3 font-['Outfit'] group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-200 group-hover:to-purple-200 transition-all duration-300">
                        {title}
                    </h3>
                    <p className="text-gray-400 text-[10px] md:text-sm leading-relaxed mb-0 md:mb-6 flex-grow group-hover:text-gray-200 transition-colors duration-300 line-clamp-2 md:line-clamp-none">
                        {description}
                    </p>

                    {/* Action */}
                    <div className="hidden md:flex items-center text-sm font-semibold text-blue-400 group-hover:text-blue-200 mt-auto translate-y-2 opacity-80 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                        <span>{t('common.launchTool')}</span>
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-2 transition-transform duration-300" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ToolCard;
